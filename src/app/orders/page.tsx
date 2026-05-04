"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/features/admin/components/admin-shell";
import RoleGuard from "@/features/auth/components/role-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { SettingsRecord } from "@/features/catalog/types";
import ReceiptPreview from "@/features/checkout/components/receipt-preview";
import { formatRupiah } from "@/features/checkout/services/checkout-calculations";
import type { CheckoutOrderRecord } from "@/features/checkout/types";

const statusOptions = [
  { value: "", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "held", label: "Held" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

const paymentMethodOptions = [
  { value: "", label: "All methods" },
  { value: "cash", label: "Cash" },
  { value: "qris", label: "QRIS" },
];

const paymentStatusOptions = [
  { value: "", label: "All payment statuses" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "expired", label: "Expired" },
  { value: "refunded", label: "Refunded" },
];

function statusClassName(status: CheckoutOrderRecord["status"]) {
  if (status === "paid") {
    return "border-[var(--success)]/30 bg-green-50 text-[var(--success)]";
  }
  if (status === "held" || status === "pending_payment") {
    return "border-[var(--warning)]/30 bg-orange-50 text-[var(--warning)]";
  }
  if (status === "cancelled" || status === "refunded") {
    return "border-[var(--danger)]/30 bg-red-50 text-[var(--danger)]";
  }
  return "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]";
}

function paymentStatusClassName(
  status: NonNullable<CheckoutOrderRecord["payment"]>["status"] | undefined,
) {
  if (status === "paid") {
    return "border-[var(--success)]/30 bg-green-50 text-[var(--success)]";
  }
  if (status === "pending" || status === "expired") {
    return "border-[var(--warning)]/30 bg-orange-50 text-[var(--warning)]";
  }
  if (status === "failed" || status === "refunded") {
    return "border-[var(--danger)]/30 bg-red-50 text-[var(--danger)]";
  }
  return "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]";
}

function OrderHistoryContent() {
  const { logout, loading, user } = useAuth();
  const [orders, setOrders] = useState<CheckoutOrderRecord[]>([]);
  const [settings, setSettings] = useState<SettingsRecord | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("");
  const [paidFrom, setPaidFrom] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<CheckoutOrderRecord | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const visibleOrders = useMemo(
    () =>
      selectedStatus
        ? orders.filter((order) => order.status === selectedStatus)
        : orders,
    [orders, selectedStatus],
  );

  const loadOrders = useCallback(async (
    filters: {
      status: string;
      paymentMethod: string;
      paymentStatus: string;
      paidFrom: string;
      paidTo: string;
    },
    options: { silent?: boolean } = {},
  ) => {
    if (!options.silent) {
      setLoadingOrders(true);
    }
    setError(null);

    try {
      const query = new URLSearchParams();
      if (filters.status) query.set("status", filters.status);
      if (filters.paymentMethod) query.set("paymentMethod", filters.paymentMethod);
      if (filters.paymentStatus) query.set("paymentStatus", filters.paymentStatus);
      if (filters.paidFrom) query.set("paidFrom", `${filters.paidFrom}T00:00:00`);
      if (filters.paidTo) query.set("paidTo", `${filters.paidTo}T23:59:59`);

      const [ordersResponse, settingsResponse] = await Promise.all([
        fetch(`/api/orders?${query.toString()}`),
        fetch("/api/settings"),
      ]);
      const [ordersData, settingsData] = await Promise.all([
        ordersResponse.json(),
        settingsResponse.json(),
      ]);

      if (!ordersResponse.ok) {
        throw new Error(ordersData.error ?? "Unable to load order history.");
      }
      if (!settingsResponse.ok) {
        throw new Error(settingsData.error ?? "Unable to load receipt settings.");
      }

      setOrders(ordersData.orders);
      setSettings(settingsData.settings);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load order history.",
      );
    } finally {
      if (!options.silent) {
        setLoadingOrders(false);
      }
    }
  }, []);

  const currentFilters = useMemo(
    () => ({
      status: selectedStatus,
      paymentMethod: selectedPaymentMethod,
      paymentStatus: selectedPaymentStatus,
      paidFrom,
      paidTo,
    }),
    [paidFrom, paidTo, selectedPaymentMethod, selectedPaymentStatus, selectedStatus],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsOnline(window.navigator.onLine);
      void loadOrders(currentFilters);
    }, 0);

    function handleOnline() {
      setIsOnline(true);
      void loadOrders(currentFilters);
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
  }, [currentFilters, loadOrders]);

  useEffect(() => {
    function refreshSilently() {
      if (!window.navigator.onLine || document.visibilityState !== "visible") {
        return;
      }

      void loadOrders(currentFilters, { silent: true });
    }

    const interval = window.setInterval(refreshSilently, 10_000);

    window.addEventListener("focus", refreshSilently);
    document.addEventListener("visibilitychange", refreshSilently);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshSilently);
      document.removeEventListener("visibilitychange", refreshSilently);
    };
  }, [currentFilters, loadOrders]);

  function applyStatus(status: string) {
    setSelectedStatus(status);
    void loadOrders({ ...currentFilters, status });
  }

  function applyPaymentFilters() {
    void loadOrders(currentFilters);
  }

  function canCancelOrder(order: CheckoutOrderRecord) {
    return ["draft", "held", "pending_payment"].includes(order.status);
  }

  async function cancelOrderFromHistory(order: CheckoutOrderRecord) {
    if (!isOnline || !canCancelOrder(order)) return;
    if (!window.confirm(`Cancel order ${order.orderNumber}?`)) return;

    setCancellingOrderId(order.id);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to cancel order.");
      }

      setOrders((current) =>
        current.map((currentOrder) =>
          currentOrder.id === order.id ? data.order : currentOrder,
        ),
      );
    } catch (cancelError) {
      setError(
        cancelError instanceof Error ? cancelError.message : "Unable to cancel order.",
      );
    } finally {
      setCancellingOrderId(null);
    }
  }

  const cashierHeader = (
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)] p-4">
        <div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {user?.role === "admin" ? "Admin" : "Cashier"}
          </p>
          <h1 className="text-xl font-semibold">Order History</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              isOnline
                ? "border-[var(--success)]/30 bg-green-50 text-[var(--success)]"
                : "border-[var(--warning)]/30 bg-orange-50 text-[var(--warning)]"
            }`}
          >
            {isOnline ? "Online" : "Offline"}
          </span>
          <Link
            href={user?.role === "admin" ? "/dashboard" : "/pos"}
            className="grid h-11 place-items-center rounded-md border border-[var(--border)] px-4 font-medium hover:bg-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            {user?.role === "admin" ? "Dashboard" : "POS"}
          </Link>
          <button
            onClick={logout}
            disabled={loading}
            className="h-11 rounded-md border border-[var(--border)] px-4 font-medium hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </header>
  );

  const orderHistoryBody = (
    <>
      {!isOnline ? (
        <div className="border-b border-[var(--warning)]/30 bg-orange-50 px-4 py-2 text-sm text-[var(--warning)]">
          Connection lost. History will refresh after reconnect.
        </div>
      ) : null}

      <section className="p-4 lg:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => applyStatus(option.value)}
                disabled={loadingOrders}
                className={`h-10 whitespace-nowrap rounded-md border px-3 text-sm font-medium disabled:opacity-60 ${
                  selectedStatus === option.value
                    ? "border-[var(--primary)] bg-blue-50 text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => loadOrders(currentFilters)}
            disabled={loadingOrders || !isOnline}
            className="h-11 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        <div className="mb-4 grid gap-3 rounded-md border border-[var(--border)] bg-[var(--card)] p-3 md:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <label className="grid gap-1 text-xs font-medium text-[var(--muted-foreground)]">
            Method
            <select
              value={selectedPaymentMethod}
              onChange={(event) => setSelectedPaymentMethod(event.target.value)}
              className="h-10 rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {paymentMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted-foreground)]">
            Payment status
            <select
              value={selectedPaymentStatus}
              onChange={(event) => setSelectedPaymentStatus(event.target.value)}
              className="h-10 rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {paymentStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted-foreground)]">
            Paid from
            <input
              type="date"
              value={paidFrom}
              onChange={(event) => setPaidFrom(event.target.value)}
              className="h-10 rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-[var(--muted-foreground)]">
            Paid to
            <input
              type="date"
              value={paidTo}
              onChange={(event) => setPaidTo(event.target.value)}
              className="h-10 rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            />
          </label>
          <button
            onClick={applyPaymentFilters}
            disabled={loadingOrders || !isOnline}
            className="h-11 self-end rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Apply
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-md border border-[var(--danger)]/30 bg-red-50 p-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--card)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-3 py-3 font-medium">Order</th>
                  <th className="px-3 py-3 font-medium">Queue</th>
                  <th className="px-3 py-3 font-medium">Time</th>
                  <th className="px-3 py-3 font-medium">Cashier</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Kitchen</th>
                  <th className="px-3 py-3 font-medium">Payment</th>
                  <th className="px-3 py-3 font-medium">Paid at</th>
                  <th className="px-3 py-3 text-right font-medium">Total</th>
                  <th className="px-3 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingOrders ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="border-b border-[var(--border)]">
                      <td className="px-3 py-3">
                        <div className="h-4 w-40 rounded-md bg-[var(--muted)]" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="h-4 w-16 rounded-md bg-[var(--muted)]" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="h-4 w-36 rounded-md bg-[var(--muted)]" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="h-4 w-32 rounded-md bg-[var(--muted)]" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="h-6 w-20 rounded-md bg-[var(--muted)]" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="h-6 w-24 rounded-md bg-[var(--muted)]" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="h-6 w-24 rounded-md bg-[var(--muted)]" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="h-4 w-36 rounded-md bg-[var(--muted)]" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="ml-auto h-4 w-24 rounded-md bg-[var(--muted)]" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="ml-auto h-9 w-20 rounded-md bg-[var(--muted)]" />
                      </td>
                    </tr>
                  ))
                ) : visibleOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-8 text-center text-[var(--muted-foreground)]"
                    >
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  visibleOrders.map((order) => (
                    <tr key={order.id} className="border-b border-[var(--border)]">
                      <td className="px-3 py-3 font-medium">{order.orderNumber}</td>
                      <td className="px-3 py-3 font-semibold">
                        {order.queueNumber ? `#${order.queueNumber}` : "-"}
                      </td>
                      <td className="px-3 py-3 text-[var(--muted-foreground)]">
                        {new Date(order.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-3">{order.cashierName ?? "-"}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-md border px-2 py-1 text-xs font-medium ${statusClassName(
                            order.status,
                          )}`}
                        >
                          {order.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {order.kitchenStatus ? (
                          <span className={`rounded-md border px-2 py-1 text-xs font-medium ${statusClassName(order.kitchenStatus === "completed" ? "paid" : "held")}`}>
                            {order.kitchenStatus}
                          </span>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {order.payment ? (
                          <div className="flex flex-wrap gap-1">
                            <span className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-1 text-xs font-medium uppercase text-[var(--muted-foreground)]">
                              {order.payment.method}
                            </span>
                            <span
                              className={`rounded-md border px-2 py-1 text-xs font-medium ${paymentStatusClassName(
                                order.payment.status,
                              )}`}
                            >
                              {order.payment.status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[var(--muted-foreground)]">
                        {order.payment?.paidAt
                          ? new Date(order.payment.paidAt).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">
                        {formatRupiah(order.totalAmount)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {canCancelOrder(order) ? (
                            <button
                              onClick={() => cancelOrderFromHistory(order)}
                              disabled={!isOnline || cancellingOrderId === order.id}
                              className="h-11 rounded-md border border-[var(--danger)]/40 px-3 font-medium text-[var(--danger)] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {cancellingOrderId === order.id ? "..." : "Cancel"}
                            </button>
                          ) : null}
                          <button
                            onClick={() => setSelectedOrder(order)}
                            disabled={order.status !== "paid"}
                            className="h-11 rounded-md border border-[var(--border)] px-3 font-medium hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {selectedOrder ? (
        <div className="fixed inset-0 z-30 grid place-items-end bg-black/20 p-0 md:place-items-center md:p-4">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-md bg-[var(--card)] p-4 md:max-w-md md:rounded-md">
            <ReceiptPreview
              order={selectedOrder}
              settings={settings}
              onClose={() => setSelectedOrder(null)}
            />
          </div>
        </div>
      ) : null}
    </>
  );

  if (user?.role === "admin") {
    return (
      <AdminShell title="Order History" eyebrow="Admin orders">
        {orderHistoryBody}
      </AdminShell>
    );
  }

  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      {cashierHeader}
      {orderHistoryBody}
    </main>
  );
}

export default function OrderHistoryPage() {
  return (
    <RoleGuard allowedRoles={["admin", "cashier"]}>
      <OrderHistoryContent />
    </RoleGuard>
  );
}
