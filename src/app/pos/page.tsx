"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/currency";
import RoleGuard from "@/features/auth/components/role-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";
import ReceiptPreview from "@/features/checkout/components/receipt-preview";
import type {
  CategoryRecord,
  ProductRecord,
  ProductVariantRecord,
  SettingsRecord,
} from "@/features/catalog/types";
import { calculateCartTotals, formatRupiah } from "@/features/checkout/services/checkout-calculations";
import { useCartStore } from "@/features/checkout/stores/cart-store";
import type { CartItem, CheckoutOrderRecord } from "@/features/checkout/types";

function isInsufficientStock(item: CartItem): boolean {
  return item.trackStock && item.stockQuantity !== null && item.quantity > item.stockQuantity;
}

function PosCart({
  isOnline,
  settings,
  onPay,
  onHold,
  holding,
  onClose,
}: {
  isOnline: boolean;
  settings: SettingsRecord | null;
  onPay: () => void;
  onHold: () => void;
  holding: boolean;
  onClose?: () => void;
}) {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const updateNotes = useCartStore((state) => state.updateNotes);
  const clearCart = useCartStore((state) => state.clearCart);
  const totals = calculateCartTotals(
    items,
    settings ?? {
      taxEnabled: false,
      taxRate: 0,
      serviceChargeEnabled: false,
      serviceChargeRate: 0,
    },
  );
  const hasStockIssue = items.some(isInsufficientStock);
  const finalActionsDisabled = !isOnline || items.length === 0 || hasStockIssue;
  const holdDisabled = !isOnline || items.length === 0 || holding;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
            Current order
          </p>
          <h2 className="text-lg font-semibold tracking-tight">Cart</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {items.length} item type(s)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearCart}
            disabled={items.length === 0}
            className="h-10 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-medium hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear
          </button>
          {onClose ? (
            <button
              onClick={onClose}
              className="h-10 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-medium hover:bg-[var(--surface)]"
            >
              Close
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] bg-white/70 p-4 text-sm text-[var(--muted-foreground)]">
            Cart is empty. Select products to begin checkout.
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/80 bg-white p-3 shadow-[0_8px_22px_rgba(20,32,51,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="break-words font-medium leading-tight">{item.productName}</p>
                    {item.variantName ? (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {item.variantName}
                      </p>
                    ) : null}
                    <p className="mt-1 break-words text-sm text-[var(--muted-foreground)]">
                      {formatRupiah(item.unitPrice)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="h-11 rounded-md border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--surface)]"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="h-11 w-11 font-semibold hover:bg-white"
                      aria-label={`Decrease ${item.productName}`}
                    >
                      -
                    </button>
                    <span className="w-11 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="h-11 w-11 font-semibold hover:bg-white"
                      aria-label={`Increase ${item.productName}`}
                    >
                      +
                    </button>
                  </div>
                  <p className="font-semibold">
                    {formatRupiah(item.unitPrice * item.quantity - item.discountAmount)}
                  </p>
                </div>
                {isInsufficientStock(item) ? (
                  <p className="mt-2 rounded-md bg-orange-50 px-2 py-1 text-xs text-[var(--warning)]">
                    Insufficient stock. Available: {item.stockQuantity}
                  </p>
                ) : null}
                <label className="mt-3 grid gap-1 text-xs font-medium text-[var(--muted-foreground)]">
                  Item note
                  <input
                    value={item.notes}
                    onChange={(event) => updateNotes(item.id, event.target.value)}
                    placeholder="Less sugar, no ice"
                    className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border)] pt-3">
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Subtotal</span>
            <span>{formatRupiah(totals.subtotalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Discount</span>
            <span>{formatRupiah(totals.discountAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Service charge</span>
            <span>{formatRupiah(totals.serviceChargeAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Tax</span>
            <span>{formatRupiah(totals.taxAmount)}</span>
          </div>
          <div className="flex justify-between rounded-lg bg-white px-3 py-2 text-lg font-semibold shadow-[0_1px_2px_rgba(20,32,51,0.06)]">
            <span>Total</span>
            <span>{formatRupiah(totals.totalAmount)}</span>
          </div>
        </div>

        {!isOnline ? (
          <p className="mt-3 rounded-md bg-orange-50 p-2 text-sm text-[var(--warning)]">
            Connection lost. Checkout actions are disabled until the POS reconnects.
          </p>
        ) : null}
        {hasStockIssue ? (
          <p className="mt-3 rounded-md bg-orange-50 p-2 text-sm text-[var(--warning)]">
            Resolve stock issues before checkout.
          </p>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={onHold}
            disabled={holdDisabled}
            className="h-11 rounded-md border border-[var(--border)] bg-white px-4 font-medium hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {holding ? "Holding..." : "Hold"}
          </button>
          <button
            onClick={onPay}
            disabled={finalActionsDisabled}
            className="h-11 rounded-md bg-[var(--primary)] px-4 font-medium text-[var(--primary-foreground)] shadow-[0_8px_18px_rgba(37,87,199,0.24)] hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Pay
          </button>
        </div>
      </div>
    </div>
  );
}

function CashPaymentModal({
  items,
  settings,
  onClose,
  onPaid,
}: {
  items: CartItem[];
  settings: SettingsRecord | null;
  onClose: () => void;
  onPaid: (order: CheckoutOrderRecord) => void;
}) {
  const [cashReceived, setCashReceived] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totals = calculateCartTotals(
    items,
    settings ?? {
      taxEnabled: false,
      taxRate: 0,
      serviceChargeEnabled: false,
      serviceChargeRate: 0,
    },
  );
  const cashAmount = Number(cashReceived);
  const changeAmount = Number.isFinite(cashAmount)
    ? Math.max(cashAmount - totals.totalAmount, 0)
    : 0;
  const quickAmounts = [
    totals.totalAmount,
    Math.ceil(totals.totalAmount / 10000) * 10000,
    Math.ceil(totals.totalAmount / 50000) * 50000,
    Math.ceil(totals.totalAmount / 100000) * 100000,
  ].filter((amount, index, amounts) => amount > 0 && amounts.indexOf(amount) === index);
  const canSubmit = Number.isFinite(cashAmount) && cashAmount >= totals.totalAmount;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const input = document.getElementById("cash-received-input");
      if (input instanceof HTMLInputElement) input.focus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  async function submitPayment() {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashReceivedAmount: cashAmount,
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            discountAmount: item.discountAmount,
            notes: item.notes,
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to complete payment.");
      }

      onPaid(data.order);
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Unable to complete payment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-end bg-black/20 p-0 md:place-items-center md:p-4">
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-md border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm md:max-w-md md:rounded-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Cash Payment</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Confirm payment from the cashier counter.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="h-11 rounded-md border border-[var(--border)] px-3 font-medium hover:bg-[var(--muted)] disabled:opacity-60"
          >
            Cancel
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-[var(--danger)]/30 bg-red-50 p-3 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        <div className="mt-4 rounded-md bg-[var(--muted)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Total</p>
          <p className="text-2xl font-semibold">{formatRupiah(totals.totalAmount)}</p>
        </div>

        <label className="mt-4 grid gap-1 text-sm font-medium">
          Cash received
          <input
            id="cash-received-input"
            inputMode="numeric"
            value={formatCurrencyInput(cashReceived)}
            onChange={(event) => setCashReceived(parseCurrencyInput(event.target.value))}
            className="h-11 rounded-md border border-[var(--border)] px-3 text-lg focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setCashReceived(amount.toString())}
              className="h-11 touch-manipulation rounded-md border border-[var(--border)] px-3 text-sm font-medium transition-[background-color,border-color,box-shadow,transform] duration-150 hover:bg-[var(--muted)] active:scale-[0.98] active:border-[var(--primary)] active:bg-[var(--primary-soft)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {formatRupiah(amount)}
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-between rounded-md border border-[var(--border)] p-3">
          <span className="text-[var(--muted-foreground)]">Change</span>
          <span className="font-semibold">{formatRupiah(changeAmount)}</span>
        </div>

        <button
          onClick={submitPayment}
          disabled={!canSubmit || submitting}
          className="mt-4 h-11 w-full touch-manipulation rounded-md bg-[var(--primary)] px-4 font-medium text-[var(--primary-foreground)] shadow-[0_8px_18px_rgba(37,87,199,0.24)] transition-[background-color,box-shadow,transform] duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.985] active:shadow-[0_3px_10px_rgba(37,87,199,0.28)] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          {submitting ? "Confirming..." : "Confirm Payment"}
        </button>
      </div>
    </div>
  );
}

function PaymentSuccessModal({
  order,
  settings,
  onClose,
}: {
  order: CheckoutOrderRecord;
  settings: SettingsRecord | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-end bg-black/20 p-0 md:place-items-center md:p-4">
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-md border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm md:max-w-md md:rounded-md">
        <div className="rounded-md border border-[var(--success)]/30 bg-green-50 p-4 text-[var(--success)]">
          <h2 className="text-lg font-semibold">Payment successful</h2>
          <p className="mt-1 text-sm">Order {order.orderNumber} is paid.</p>
          {order.queueNumber ? (
            <p className="mt-3 text-3xl font-semibold">Queue #{order.queueNumber}</p>
          ) : null}
        </div>
        <div className="mt-4">
          <ReceiptPreview order={order} settings={settings} autoPrint />
        </div>
        <button
          onClick={onClose}
          className="mt-4 h-11 w-full rounded-md bg-[var(--primary)] px-4 font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
        >
          New order
        </button>
      </div>
    </div>
  );
}

function HeldOrdersModal({
  orders,
  loading,
  error,
  cancellingOrderId,
  onClose,
  onReload,
  onResume,
  onCancel,
}: {
  orders: CheckoutOrderRecord[];
  loading: boolean;
  error: string | null;
  cancellingOrderId: string | null;
  onClose: () => void;
  onReload: () => void;
  onResume: (order: CheckoutOrderRecord) => void;
  onCancel: (order: CheckoutOrderRecord) => void;
}) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-end bg-black/20 p-0 md:place-items-center md:p-4">
      <div className="flex max-h-[90dvh] w-full flex-col rounded-t-md border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm md:max-w-2xl md:rounded-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Held Orders</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Resume saved cashier carts.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onReload}
              disabled={loading}
              className="h-10 rounded-md border border-[var(--border)] px-3 font-medium hover:bg-[var(--muted)] disabled:opacity-60"
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              className="h-10 rounded-md border border-[var(--border)] px-3 font-medium hover:bg-[var(--muted)]"
            >
              Close
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-[var(--danger)]/30 bg-red-50 p-3 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 rounded-md border border-[var(--border)] bg-[var(--card)] p-3"
                >
                  <div className="h-4 w-40 rounded-md bg-[var(--muted)]" />
                  <div className="mt-4 h-4 w-56 rounded-md bg-[var(--muted)]" />
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-md border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
              No held orders are waiting.
            </div>
          ) : (
            <div className="grid gap-2">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="grid gap-3 rounded-md border border-[var(--border)] p-3 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{order.orderNumber}</p>
                      <span className="rounded-md border border-[var(--warning)]/30 bg-orange-50 px-2 py-1 text-xs font-medium text-[var(--warning)]">
                        Held
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {order.items.length} item type(s) -{" "}
                      {order.heldAt
                        ? new Date(order.heldAt).toLocaleString()
                        : "No hold time"}
                    </p>
                    <p className="mt-2 font-semibold">
                      {formatRupiah(order.totalAmount)}
                    </p>
                  </div>
                  <div className="grid gap-2 self-center sm:grid-cols-2">
                    <button
                      onClick={() => onCancel(order)}
                      disabled={cancellingOrderId === order.id}
                      className="h-11 rounded-md border border-[var(--danger)]/40 px-4 font-medium text-[var(--danger)] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancellingOrderId === order.id ? "Cancelling..." : "Cancel"}
                    </button>
                    <button
                      onClick={() => onResume(order)}
                      disabled={cancellingOrderId === order.id}
                      className="h-11 rounded-md bg-[var(--primary)] px-4 font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Resume
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VariantPicker({
  product,
  onSelect,
  onClose,
}: {
  product: ProductRecord;
  onSelect: (variant: ProductVariantRecord | null) => void;
  onClose: () => void;
}) {
  const activeVariants = product.variants.filter((variant) => variant.isActive);

  return (
    <div className="fixed inset-0 z-20 grid place-items-end bg-black/20 p-0 md:place-items-center md:p-4">
      <div className="w-full rounded-t-md border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm md:max-w-md md:rounded-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{product.name}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Select a variant for this item.
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-11 rounded-md border border-[var(--border)] px-3 font-medium hover:bg-[var(--muted)]"
          >
            Cancel
          </button>
        </div>
        <div className="mt-4 grid gap-2">
          <button
            onClick={() => onSelect(null)}
            className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-[var(--border)] px-3 py-2 text-left font-medium hover:bg-[var(--muted)]"
          >
            <span className="min-w-0 break-words">Base</span>
            <span>{formatRupiah(product.price)}</span>
          </button>
          {activeVariants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => onSelect(variant)}
              className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-[var(--border)] px-3 py-2 text-left font-medium hover:bg-[var(--muted)]"
            >
              <span className="min-w-0 break-words">{variant.name}</span>
              <span>{formatRupiah(product.price + variant.priceDelta)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PosContent() {
  const { logout, loading, user } = useAuth();
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [settings, setSettings] = useState<SettingsRecord | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tappedProductId, setTappedProductId] = useState<string | null>(null);
  const [variantProduct, setVariantProduct] = useState<ProductRecord | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [paidOrder, setPaidOrder] = useState<CheckoutOrderRecord | null>(null);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [heldOrders, setHeldOrders] = useState<CheckoutOrderRecord[]>([]);
  const [loadingHeldOrders, setLoadingHeldOrders] = useState(false);
  const [heldOrdersError, setHeldOrdersError] = useState<string | null>(null);
  const [holdingOrder, setHoldingOrder] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const clearCart = useCartStore((state) => state.clearCart);
  const replaceFromHeldOrder = useCartStore((state) => state.replaceFromHeldOrder);

  async function loadCatalog(options?: { categoryId?: string; search?: string }) {
    setLoadingCatalog(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      if (options?.categoryId) query.set("categoryId", options.categoryId);
      if (options?.search) query.set("search", options.search);

      const [categoryResponse, productResponse, settingsResponse] = await Promise.all([
        fetch("/api/categories"),
        fetch(`/api/products?${query.toString()}`),
        fetch("/api/settings"),
      ]);
      const [categoryData, productData, settingsData] = await Promise.all([
        categoryResponse.json(),
        productResponse.json(),
        settingsResponse.json(),
      ]);

      if (!categoryResponse.ok) throw new Error(categoryData.error ?? "Unable to load categories.");
      if (!productResponse.ok) throw new Error(productData.error ?? "Unable to load products.");
      if (!settingsResponse.ok) throw new Error(settingsData.error ?? "Unable to load settings.");

      setCategories(categoryData.categories);
      setProducts(productData.products);
      setSettings(settingsData.settings);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load POS data.");
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function loadHeldOrders() {
    setLoadingHeldOrders(true);
    setHeldOrdersError(null);

    try {
      const response = await fetch("/api/orders/held");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load held orders.");
      }

      setHeldOrders(data.orders);
    } catch (loadError) {
      setHeldOrdersError(
        loadError instanceof Error ? loadError.message : "Unable to load held orders.",
      );
    } finally {
      setLoadingHeldOrders(false);
    }
  }

  async function holdCurrentOrder() {
    if (!isOnline || cartItems.length === 0) return;

    setHoldingOrder(true);
    setCartMessage(null);

    try {
      const response = await fetch("/api/orders/held", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            discountAmount: item.discountAmount,
            notes: item.notes,
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to hold order.");
      }

      clearCart();
      setCartMessage(`Held order ${data.order.orderNumber}.`);
      void loadHeldOrders();
    } catch (holdError) {
      setCartMessage(
        holdError instanceof Error ? holdError.message : "Unable to hold order.",
      );
    } finally {
      setHoldingOrder(false);
    }
  }

  function openHeldOrders() {
    setShowHeldOrders(true);
    void loadHeldOrders();
  }

  function resumeHeldOrder(order: CheckoutOrderRecord) {
    if (
      cartItems.length > 0 &&
      !window.confirm("Resume this held order and replace the current cart?")
    ) {
      return;
    }

    replaceFromHeldOrder(order);
    setCartMessage(`Resumed order ${order.orderNumber}.`);
    setShowHeldOrders(false);
  }

  async function cancelHeldOrder(order: CheckoutOrderRecord) {
    if (!isOnline) return;
    if (!window.confirm(`Cancel held order ${order.orderNumber}?`)) return;

    setCancellingOrderId(order.id);
    setHeldOrdersError(null);

    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to cancel order.");
      }

      setHeldOrders((current) => current.filter((heldOrder) => heldOrder.id !== order.id));
      setCartMessage(`Cancelled order ${order.orderNumber}.`);
    } catch (cancelError) {
      setHeldOrdersError(
        cancelError instanceof Error ? cancelError.message : "Unable to cancel order.",
      );
    } finally {
      setCancellingOrderId(null);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadCatalog();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsOnline(window.navigator.onLine);
    }, 0);

    function handleOnline() {
      setIsOnline(true);
      void loadCatalog({ categoryId: activeCategoryId, search });
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
  }, [activeCategoryId, search]);

  const storeName = settings?.storeName ?? "Maza Cafe";
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const mobileHasStockIssue = cartItems.some(isInsufficientStock);
  const mobileTotals = calculateCartTotals(
    cartItems,
    settings ?? {
      taxEnabled: false,
      taxRate: 0,
      serviceChargeEnabled: false,
      serviceChargeRate: 0,
    },
  );

  function handleProductClick(product: ProductRecord) {
    setTappedProductId(product.id);
    window.setTimeout(() => setTappedProductId(null), 260);

    const activeVariants = product.variants.filter((variant) => variant.isActive);
    if (activeVariants.length > 0) {
      setVariantProduct(product);
      return;
    }

    addItem({ product });
  }

  function applyFilters(categoryId: string, nextSearch = search) {
    setActiveCategoryId(categoryId);
    void loadCatalog({ categoryId, search: nextSearch });
  }

  return (
    <main className="grid h-dvh grid-rows-[auto_1fr] bg-[var(--background)] text-[var(--foreground)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/70 bg-white/85 px-4 py-3 shadow-[0_1px_10px_rgba(20,32,51,0.08)] backdrop-blur">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
            Cashier POS
          </p>
          <h1 className="break-words text-xl font-semibold tracking-tight sm:text-2xl">{storeName}</h1>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <span className="hidden text-sm text-[var(--muted-foreground)] sm:inline">
            {user?.name}
          </span>
          <button
            onClick={openHeldOrders}
            disabled={!isOnline}
            className="h-11 rounded-md border border-[var(--border)] bg-white px-4 font-medium shadow-[0_1px_2px_rgba(20,32,51,0.06)] hover:border-[var(--primary)]/35 hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Held
          </button>
          <Link
            href="/orders"
            className="grid h-11 place-items-center rounded-md border border-[var(--border)] bg-white px-4 font-medium shadow-[0_1px_2px_rgba(20,32,51,0.06)] hover:border-[var(--primary)]/35 hover:bg-[var(--surface)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            History
          </Link>
          <Link
            href="/kitchen"
            className="grid h-11 place-items-center rounded-md border border-[var(--border)] bg-white px-4 font-medium shadow-[0_1px_2px_rgba(20,32,51,0.06)] hover:border-[var(--primary)]/35 hover:bg-[var(--surface)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Kitchen
          </Link>
          <span
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              isOnline
                ? "border-[var(--success)]/30 bg-green-50 text-[var(--success)]"
                : "border-[var(--warning)]/30 bg-orange-50 text-[var(--warning)]"
            }`}
          >
            {isOnline ? "Online" : "Offline"}
          </span>
          <button
            onClick={logout}
            disabled={loading}
            className="h-11 rounded-md border border-[var(--border)] bg-white px-4 font-medium shadow-[0_1px_2px_rgba(20,32,51,0.06)] hover:border-[var(--primary)]/35 hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </header>

      {!isOnline ? (
        <div className="border-b border-[var(--warning)]/30 bg-orange-50 px-4 py-2 text-sm text-[var(--warning)]">
          Connection lost. Checkout actions are disabled until the POS reconnects.
        </div>
      ) : null}

      <section className="grid min-h-0 md:grid-cols-[minmax(0,1fr)_340px] lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 overflow-y-auto p-4 pb-28 md:pb-4">
          <div className="grid gap-4">
            <div className="rounded-lg border border-white/80 bg-white/85 p-4 shadow-[0_10px_30px_rgba(20,32,51,0.08)]">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="grid gap-1 text-sm font-medium">
                Search products
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applyFilters(activeCategoryId);
                  }}
                  placeholder="Coffee, SKU, food"
                  className="h-11 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                />
              </label>
              <button
                onClick={() => applyFilters(activeCategoryId)}
                disabled={loadingCatalog}
                className="h-11 self-end rounded-md bg-[var(--primary)] px-4 font-medium text-[var(--primary-foreground)] shadow-[0_8px_18px_rgba(37,87,199,0.22)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                Search
              </button>
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => applyFilters("")}
                className={`h-10 whitespace-nowrap rounded-md border px-3 text-sm font-medium ${
                  activeCategoryId === ""
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)] shadow-[0_6px_14px_rgba(37,87,199,0.12)]"
                    : "border-[var(--border)] bg-white hover:bg-[var(--surface)]"
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => applyFilters(category.id)}
                  className={`h-10 whitespace-nowrap rounded-md border px-3 text-sm font-medium ${
                    activeCategoryId === category.id
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)] shadow-[0_6px_14px_rgba(37,87,199,0.12)]"
                      : "border-[var(--border)] bg-white hover:bg-[var(--surface)]"
                  }`}
                >
                  {category.name}
                </button>
              ))}
              </div>
            </div>

            {error ? (
              <div className="rounded-md border border-[var(--danger)]/30 bg-red-50 p-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            ) : null}

            {cartMessage ? (
              <div className="rounded-lg border border-[var(--info)]/30 bg-[var(--primary-soft)] p-3 text-sm text-[var(--info)]">
                {cartMessage}
              </div>
            ) : null}

            {loadingCatalog ? (
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="h-32 rounded-lg border border-white/80 bg-white p-3 shadow-[0_8px_22px_rgba(20,32,51,0.08)]">
                    <div className="h-5 rounded-md bg-[var(--muted)]" />
                    <div className="mt-10 h-4 w-20 rounded-md bg-[var(--muted)]" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border)] bg-white/85 p-8 text-center shadow-[0_10px_30px_rgba(20,32,51,0.08)]">
                <h2 className="font-semibold">No products found</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Reset search or choose another category.
                </p>
                <button
                  onClick={() => {
                    setSearch("");
                    applyFilters("", "");
                  }}
                  className="mt-4 h-11 rounded-md border border-[var(--border)] bg-white px-4 font-medium hover:bg-[var(--surface)]"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
                {products.map((product) => {
                  const outOfStock =
                    product.trackStock &&
                    product.stockQuantity !== null &&
                    product.stockQuantity <= 0;
                  const disabled = !product.isAvailable || outOfStock || !product.canSellOne;

                  return (
                    <button
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      disabled={disabled}
                      className={`min-h-32 rounded-lg border border-white/80 bg-white p-3 text-left shadow-[0_8px_22px_rgba(20,32,51,0.08)] transition-[background-color,border-color,box-shadow,transform] duration-150 hover:border-[var(--primary)]/35 hover:bg-[var(--surface)] hover:shadow-[0_14px_30px_rgba(20,32,51,0.12)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                        tappedProductId === product.id
                          ? "pos-card-tap border-[var(--primary)] bg-[var(--primary-soft)] ring-2 ring-[var(--primary)]/20"
                          : ""
                      }`}
                    >
                      <div className="flex h-full flex-col justify-between gap-3">
                        <div>
                          <p className="line-clamp-2 break-words font-medium leading-tight">{product.name}</p>
                          <p className="mt-1 break-words text-xs text-[var(--muted-foreground)]">
                            {product.categoryName}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[var(--muted-foreground)]">
                            {formatRupiah(product.price)}
                          </p>
                          {product.variants.some((variant) => variant.isActive) ? (
                            <p className="mt-1 text-xs text-[var(--info)]">Variants</p>
                          ) : null}
                          {outOfStock ? (
                            <p className="mt-1 text-xs text-[var(--warning)]">Out of stock</p>
                          ) : null}
                          {!outOfStock && !product.canSellOne ? (
                            <p className="mt-1 break-words text-xs text-[var(--warning)]">
                              {product.unavailableReason ?? "Ingredients unavailable"}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="hidden min-h-0 border-l border-white/70 bg-[var(--surface-alt)] p-4 shadow-[-8px_0_24px_rgba(20,32,51,0.08)] md:block">
          <PosCart
            isOnline={isOnline}
            settings={settings}
            onPay={() => setShowPayment(true)}
            onHold={holdCurrentOrder}
            holding={holdingOrder}
          />
        </aside>
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-[var(--border)] bg-[var(--card)] p-3 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setShowMobileCart(true)}
            disabled={cartItems.length === 0}
            className="min-w-0 flex-1 rounded-md p-1 text-left disabled:opacity-60"
          >
            <p className="text-sm text-[var(--muted-foreground)]">{itemCount} item(s)</p>
            <p className="truncate text-base font-semibold sm:text-lg">{formatRupiah(mobileTotals.totalAmount)}</p>
          </button>
          <div className="grid shrink-0 grid-cols-2 gap-2">
            <button
              disabled={!isOnline || cartItems.length === 0 || holdingOrder}
              onClick={holdCurrentOrder}
              className="h-11 rounded-md border border-[var(--border)] px-3 font-medium disabled:opacity-60"
            >
              Hold
            </button>
            <button
              disabled={!isOnline || cartItems.length === 0 || mobileHasStockIssue}
              onClick={() => setShowPayment(true)}
              className="h-11 rounded-md bg-[var(--primary)] px-3 font-medium text-[var(--primary-foreground)] disabled:opacity-60"
            >
              Pay
            </button>
          </div>
        </div>
      </div>

      {showMobileCart ? (
        <div className="fixed inset-0 z-20 grid place-items-end bg-black/20 p-0 md:hidden">
          <div className="h-[86dvh] w-full rounded-t-md border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <PosCart
              isOnline={isOnline}
              settings={settings}
              onPay={() => {
                setShowMobileCart(false);
                setShowPayment(true);
              }}
              onHold={holdCurrentOrder}
              holding={holdingOrder}
              onClose={() => setShowMobileCart(false)}
            />
          </div>
        </div>
      ) : null}

      {variantProduct ? (
        <VariantPicker
          product={variantProduct}
          onClose={() => setVariantProduct(null)}
          onSelect={(variant) => {
            addItem({ product: variantProduct, variant });
            setVariantProduct(null);
          }}
        />
      ) : null}

      {showPayment ? (
        <CashPaymentModal
          items={cartItems}
          settings={settings}
          onClose={() => setShowPayment(false)}
          onPaid={(order) => {
            clearCart();
            setShowPayment(false);
            setPaidOrder(order);
            void loadCatalog({ categoryId: activeCategoryId, search });
          }}
        />
      ) : null}

      {showHeldOrders ? (
        <HeldOrdersModal
          orders={heldOrders}
          loading={loadingHeldOrders}
          error={heldOrdersError}
          cancellingOrderId={cancellingOrderId}
          onClose={() => setShowHeldOrders(false)}
          onReload={loadHeldOrders}
          onResume={resumeHeldOrder}
          onCancel={cancelHeldOrder}
        />
      ) : null}

      {paidOrder ? (
        <PaymentSuccessModal
          order={paidOrder}
          settings={settings}
          onClose={() => setPaidOrder(null)}
        />
      ) : null}
    </main>
  );
}

export default function PosPage() {
  return (
    <RoleGuard allowedRoles={["cashier", "admin"]}>
      <PosContent />
    </RoleGuard>
  );
}
