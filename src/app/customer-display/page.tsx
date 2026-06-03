"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RoleGuard from "@/features/auth/components/role-guard";
import { CUSTOMER_DISPLAY_ACCESS_ROLES } from "@/features/auth/utils/role-routes";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { formatRupiah } from "@/features/checkout/services/checkout-calculations";
import type { CustomerDisplayRecord } from "@/features/customer-display/types";

function formatOrderType(orderType: CustomerDisplayRecord["orderType"]) {
  if (orderType === "dine_in") return "Dine-in";
  if (orderType === "delivery") return "Delivery";
  if (orderType === "takeaway") return "Take-away";
  return null;
}

function CustomerDisplayContent() {
  const { logout, loading } = useAuth();
  const [display, setDisplay] = useState<CustomerDisplayRecord | null>(null);
  const [loadingDisplay, setLoadingDisplay] = useState(true);
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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsOnline(window.navigator.onLine);
      void loadDisplay();
    }, 0);

    function handleOnline() {
      setIsOnline(true);
      void loadDisplay();
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
  }, [loadDisplay]);

  useEffect(() => {
    function refreshSilently() {
      if (!window.navigator.onLine || document.visibilityState !== "visible") return;
      void loadDisplay({ silent: true });
    }

    const interval = window.setInterval(refreshSilently, 1_500);
    return () => window.clearInterval(interval);
  }, [loadDisplay]);

  const orderTypeLabel = useMemo(() => formatOrderType(display?.orderType ?? null), [display?.orderType]);
  const showSummary = display?.status === "active" && (display.items.length > 0 || display.totals.totalAmount > 0);
  const showPaid = display?.status === "paid";

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
            onClick={() => loadDisplay()}
            disabled={loadingDisplay || !isOnline}
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

      <section className="flex flex-1 flex-col px-6 py-6">
        {loadingDisplay && !display ? (
          <div className="mx-auto w-full max-w-5xl animate-pulse rounded-xl border border-[var(--border)] bg-[var(--card)] p-8">
            <div className="h-8 w-48 rounded bg-[var(--muted)]" />
            <div className="mt-8 grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-14 rounded bg-[var(--muted)]" />
              ))}
            </div>
          </div>
        ) : showPaid ? (
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] p-10 text-center shadow-[0_1px_2px_rgba(20,32,51,0.08)]">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Thank you</p>
            <h2 className="mt-3 text-4xl font-semibold">Payment received</h2>
            {display?.paidOrderNumber ? (
              <p className="mt-2 text-lg text-[var(--muted-foreground)]">Order {display.paidOrderNumber}</p>
            ) : null}
            <p className="mt-6 text-5xl font-semibold">{formatRupiah(display?.totals.totalAmount ?? 0)}</p>
          </div>
        ) : showSummary ? (
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_2px_rgba(20,32,51,0.08)]">
            <div className="border-b border-[var(--border)] px-6 py-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                    Order summary
                  </p>
                  {orderTypeLabel ? (
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{orderTypeLabel}</p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--muted-foreground)]">Total</p>
                  <p className="text-3xl font-semibold">{formatRupiah(display?.totals.totalAmount ?? 0)}</p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-[4rem_minmax(0,1fr)_8rem] gap-3 border-b border-[var(--border)] pb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                <span>Qty</span>
                <span>Item</span>
                <span className="text-right">Price</span>
              </div>

              <div className="divide-y divide-[var(--border)]">
                {display?.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[4rem_minmax(0,1fr)_8rem] gap-3 py-4">
                    <span className="text-lg font-medium">{item.quantity}</span>
                    <div className="min-w-0">
                      <p className="text-lg font-medium leading-tight">{item.productName}</p>
                      {item.selectedOptions.length > 0 ? (
                        <div className="mt-2 grid gap-1 pl-3 text-sm text-[var(--muted-foreground)]">
                          {item.selectedOptions.map((option) => (
                            <p key={`${option.groupName}:${option.valueName}`}>
                              {option.groupName}: {option.valueName}
                              {option.priceDelta > 0 ? ` · ${formatRupiah(option.priceDelta)}` : ""}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <span className="text-right text-lg font-semibold">{formatRupiah(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[var(--border)] px-6 py-5">
              <div className="grid gap-2 text-sm md:max-w-sm md:ml-auto">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Subtotal</span>
                  <span>{formatRupiah(display?.totals.subtotalAmount ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Discount</span>
                  <span>{formatRupiah(display?.totals.discountAmount ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Service charge</span>
                  <span>{formatRupiah(display?.totals.serviceChargeAmount ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Tax</span>
                  <span>{formatRupiah(display?.totals.taxAmount ?? 0)}</span>
                </div>
                <div className="mt-2 flex justify-between rounded-lg bg-[var(--surface)] px-3 py-2 text-xl font-semibold">
                  <span>Total</span>
                  <span>{formatRupiah(display?.totals.totalAmount ?? 0)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] p-10 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Waiting for order
            </p>
            <h2 className="mt-3 text-3xl font-semibold">Your order will appear here</h2>
            <p className="mt-2 max-w-md text-sm text-[var(--muted-foreground)]">
              Items added on the POS register will show on this screen in real time.
            </p>
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
