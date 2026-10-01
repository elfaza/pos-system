"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RoleGuard from "@/features/auth/components/role-guard";
import { CUSTOMER_DISPLAY_ACCESS_ROLES } from "@/features/auth/utils/role-routes";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { formatRupiah } from "@/features/checkout/services/checkout-calculations";
import { getNextCategoryIndex } from "@/features/customer-display/services/menu-rotation";
import type {
  CustomerDisplayMenuRecord,
  CustomerDisplayRecord,
} from "@/features/customer-display/types";

function formatOrderType(orderType: CustomerDisplayRecord["orderType"]) {
  if (orderType === "dine_in") return "Dine-in";
  if (orderType === "delivery") return "Delivery";
  if (orderType === "takeaway") return "Take-away";
  return null;
}

function CustomerDisplayContent() {
  const { logout, loading } = useAuth();
  const [display, setDisplay] = useState<CustomerDisplayRecord | null>(null);
  const [menu, setMenu] = useState<CustomerDisplayMenuRecord>({ categories: [] });
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [loadingDisplay, setLoadingDisplay] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const loadDisplay = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setLoadingDisplay(true);
    setError(null);

    try {
      const response = await fetch("/api/customer-display");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load customer display.");
      setDisplay(data.display);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load customer display.");
    } finally {
      if (!options.silent) setLoadingDisplay(false);
    }
  }, []);

  const loadMenu = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setLoadingMenu(true);

    try {
      const response = await fetch("/api/customer-display/menu");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load active menu.");
      setMenu(data.menu);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load active menu.");
    } finally {
      if (!options.silent) setLoadingMenu(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsOnline(window.navigator.onLine);
      void loadDisplay();
      void loadMenu();
    }, 0);

    function handleOnline() {
      setIsOnline(true);
      void loadDisplay();
      void loadMenu();
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadDisplay, loadMenu]);

  useEffect(() => {
    function refreshSilently() {
      if (!window.navigator.onLine || document.visibilityState !== "visible") return;
      void loadDisplay({ silent: true });
    }

    const interval = window.setInterval(refreshSilently, 1_500);
    return () => window.clearInterval(interval);
  }, [loadDisplay]);

  useEffect(() => {
    function refreshMenuSilently() {
      if (!window.navigator.onLine || document.visibilityState !== "visible") return;
      void loadMenu({ silent: true });
    }

    const interval = window.setInterval(refreshMenuSilently, 30_000);
    return () => window.clearInterval(interval);
  }, [loadMenu]);

  useEffect(() => {
    if (menu.categories.length <= 1) return;

    const interval = window.setInterval(() => {
      setActiveCategoryIndex((current) =>
        getNextCategoryIndex(current, menu.categories.length),
      );
    }, 10_000);

    return () => window.clearInterval(interval);
  }, [menu.categories.length]);

  const orderTypeLabel = useMemo(() => formatOrderType(display?.orderType ?? null), [display?.orderType]);
  const showSummary = display?.status === "active" && (display.items.length > 0 || display.totals.totalAmount > 0);
  const showPaid = display?.status === "paid";
  const activeCategory = menu.categories[activeCategoryIndex] ?? menu.categories[0] ?? null;

  return (
    <main className="flex min-h-dvh flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)] px-6 py-4">
        <div>
          <p className="text-sm text-[var(--muted-foreground)]">Customer facing display</p>
          <h1 className="text-2xl font-semibold tracking-tight">{display?.storeName ?? "Order summary"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-md border px-3 py-2 text-sm font-medium ${isOnline ? "border-[var(--success)]/30 bg-green-50 text-[var(--success)]" : "border-[var(--warning)]/30 bg-orange-50 text-[var(--warning)]"}`}
          >
            {isOnline ? "Online" : "Offline"}
          </span>
          <button
            onClick={() => {
              void loadDisplay();
              void loadMenu();
            }}
            disabled={loadingDisplay || loadingMenu || !isOnline}
            className="h-10 rounded-md border border-[var(--border)] bg-white px-4 text-xs font-bold uppercase tracking-wide hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>
          <button
            onClick={logout}
            disabled={loading}
            className="h-10 rounded-md border border-[var(--border)] bg-white px-4 text-xs font-bold uppercase tracking-wide hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </header>

      {!isOnline ? (
        <div className="border-b border-[var(--warning)]/30 bg-orange-50 px-6 py-2 text-sm text-[var(--warning)]">
          Connection lost. Display updates are paused until reconnect.
        </div>
      ) : null}

      {error ? (
        <div className="mx-6 mt-4 rounded-md border border-[var(--danger)]/30 bg-red-50 p-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6">
        {loadingDisplay && !display ? (
          <div className="grid flex-1 animate-pulse gap-4 lg:grid-cols-[minmax(20rem,35%)_12rem_minmax(0,1fr)]">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="min-h-64 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
                <div className="h-6 w-32 rounded bg-[var(--muted)]" />
                <div className="mt-6 grid gap-3">
                  {Array.from({ length: 4 }).map((__, rowIndex) => (
                    <div key={rowIndex} className="h-14 rounded bg-[var(--muted)]" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-4 overflow-y-auto lg:grid-cols-[minmax(20rem,35%)_12rem_minmax(0,1fr)] lg:overflow-hidden">
            <div className="flex min-h-96 min-w-0 flex-col rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_2px_rgba(20,32,51,0.08)] lg:min-h-0">
              {showPaid ? (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Thank you</p>
                  <h2 className="mt-3 text-3xl font-semibold">Payment received</h2>
                  {display?.paidOrderNumber ? (
                    <p className="mt-2 text-base text-[var(--muted-foreground)]">Order {display.paidOrderNumber}</p>
                  ) : null}
                  <p className="mt-6 text-4xl font-semibold">{formatRupiah(display?.totals.totalAmount ?? 0)}</p>
                </div>
              ) : showSummary ? (
                <>
                  <div className="border-b border-[var(--border)] px-5 py-4">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Order summary</p>
                        {orderTypeLabel ? <p className="mt-1 text-sm text-[var(--muted-foreground)]">{orderTypeLabel}</p> : null}
                      </div>
                      <p className="text-sm font-medium">{display?.items.reduce((total, item) => total + item.quantity, 0)} items</p>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-5">
                    <div className="divide-y divide-[var(--border)]">
                      {display?.items.map((item) => (
                        <div key={item.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)_7rem] gap-2 py-4">
                          <span className="font-medium">{item.quantity}x</span>
                          <div className="min-w-0">
                            <p className="break-words font-medium leading-tight">{item.productName}</p>
                            {item.selectedOptions.map((option) => (
                              <p key={`${option.groupName}:${option.valueName}`} className="mt-1 text-xs text-[var(--muted-foreground)]">
                                {option.groupName}: {option.valueName}
                              </p>
                            ))}
                          </div>
                          <span className="text-right font-semibold">{formatRupiah(item.lineTotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4">
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Subtotal</span><span>{formatRupiah(display?.totals.subtotalAmount ?? 0)}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Discount</span><span>{formatRupiah(display?.totals.discountAmount ?? 0)}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Service charge</span><span>{formatRupiah(display?.totals.serviceChargeAmount ?? 0)}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Tax</span><span>{formatRupiah(display?.totals.taxAmount ?? 0)}</span></div>
                      <div className="mt-2 flex justify-between rounded-md border border-[var(--border)] bg-white px-3 py-3 text-xl font-semibold"><span>Total</span><span>{formatRupiah(display?.totals.totalAmount ?? 0)}</span></div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Waiting for order</p>
                  <h2 className="mt-3 text-2xl font-semibold">Your order will appear here</h2>
                  <p className="mt-2 max-w-sm text-sm text-[var(--muted-foreground)]">Items added on the POS register will show on this screen in real time.</p>
                </div>
              )}
            </div>

            <nav className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-[0_1px_2px_rgba(20,32,51,0.08)] lg:min-h-0 lg:overflow-y-auto">
              <p className="px-2 pb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Categories</p>
              <div className="flex gap-2 overflow-x-auto lg:grid lg:overflow-visible">
                {menu.categories.map((category, index) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategoryIndex(index)}
                    className={`min-h-11 min-w-32 rounded-md border px-3 py-2 text-left text-sm font-medium lg:min-w-0 ${
                      activeCategory?.id === category.id
                        ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "border-[var(--border)] bg-white hover:bg-[var(--surface)]"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
                {!loadingMenu && menu.categories.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-[var(--muted-foreground)]">No active categories.</p>
                ) : null}
              </div>
            </nav>

            <div className="flex min-h-96 min-w-0 flex-col rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_1px_2px_rgba(20,32,51,0.08)] lg:min-h-0">
              <div className="flex items-end justify-between gap-3 border-b border-[var(--border)] pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Available now</p>
                  <h2 className="mt-1 text-xl font-semibold">{activeCategory?.name ?? "Menu"}</h2>
                </div>
                {activeCategory ? <span className="text-sm text-[var(--muted-foreground)]">{activeCategory.products.length} items</span> : null}
              </div>
              <div className="mt-4 grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto">
                {activeCategory?.products.map((product) => (
                  <article
                    key={product.id}
                    className={`flex min-w-0 flex-col rounded-md border border-[var(--border)] bg-white p-3 ${
                      product.imageUrl ? "min-h-36" : "min-h-24"
                    }`}
                  >
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt={product.name} className="h-20 w-full rounded object-cover" />
                    ) : null}
                    <h3 className={`${product.imageUrl ? "mt-3" : ""} break-words font-medium leading-tight`}>{product.name}</h3>
                    <p className="mt-auto pt-3 font-semibold text-[var(--primary)]">{formatRupiah(product.price)}</p>
                  </article>
                ))}
                {!loadingMenu && !activeCategory ? (
                  <div className="col-span-2 grid min-h-48 place-items-center rounded-md border border-dashed border-[var(--border)] text-center text-sm text-[var(--muted-foreground)]">No active menu items.</div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default function CustomerDisplayPage() {
  return (
    <RoleGuard allowedRoles={[...CUSTOMER_DISPLAY_ACCESS_ROLES]}>
      <CustomerDisplayContent />
    </RoleGuard>
  );
}
