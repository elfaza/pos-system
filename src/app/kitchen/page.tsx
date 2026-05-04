"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/features/admin/components/admin-shell";
import RoleGuard from "@/features/auth/components/role-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { formatRupiah } from "@/features/checkout/services/checkout-calculations";
import type { KitchenBoardRecord, KitchenQueueRecord, KitchenStatus } from "@/features/kitchen/types";

const columns: Array<{
  key: keyof KitchenBoardRecord;
  title: string;
  empty: string;
}> = [
  { key: "received", title: "Received", empty: "No waiting orders." },
  { key: "preparing", title: "Preparing", empty: "No orders in prep." },
  { key: "ready", title: "Ready", empty: "No orders ready." },
];

function nextActions(status: KitchenStatus): Array<{ status: KitchenStatus; label: string }> {
  if (status === "received") {
    return [
      { status: "preparing", label: "Start" },
      { status: "ready", label: "Ready" },
    ];
  }
  if (status === "preparing") return [{ status: "ready", label: "Ready" }];
  if (status === "ready") return [{ status: "completed", label: "Complete" }];
  return [];
}

function statusClassName(status: KitchenStatus) {
  if (status === "ready") return "border-[var(--success)]/30 bg-green-50 text-[var(--success)]";
  if (status === "preparing") return "border-[var(--warning)]/30 bg-orange-50 text-[var(--warning)]";
  return "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]";
}

function KitchenOrderCard({
  order,
  disabled,
  updatingStatus,
  onStatusChange,
}: {
  order: KitchenQueueRecord;
  disabled: boolean;
  updatingStatus: string | null;
  onStatusChange: (order: KitchenQueueRecord, status: KitchenStatus) => void;
}) {
  const isUpdating = updatingStatus === order.id;

  return (
    <article className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--card)] p-3 shadow-[0_1px_2px_rgba(20,32,51,0.08)]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="break-words text-2xl font-semibold sm:text-3xl">#{order.queueNumber}</p>
          <p className="truncate text-sm text-[var(--muted-foreground)]" title={order.orderNumber}>{order.orderNumber}</p>
        </div>
        <span className={`rounded-md border px-2 py-1 text-xs font-medium ${statusClassName(order.kitchenStatus)}`}>
          {order.kitchenStatus}
        </span>
      </div>

      <div className="mt-3 grid gap-2 text-sm">
        {order.items.map((item) => (
          <div key={item.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
              <span className="min-w-0 break-words font-medium">
                {item.quantity} x {item.productNameSnapshot}
                {item.variantNameSnapshot ? ` / ${item.variantNameSnapshot}` : ""}
              </span>
              <span className="shrink-0 whitespace-nowrap text-[var(--muted-foreground)]">
                {formatRupiah(item.lineTotal)}
              </span>
            </div>
            {item.notes ? (
              <p className="mt-1 break-words text-xs text-[var(--muted-foreground)]">
                Note: {item.notes}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-1 text-xs text-[var(--muted-foreground)]">
        <p>Paid: {order.paidAt ? new Date(order.paidAt).toLocaleTimeString() : "-"}</p>
        <p>Cashier: {order.cashierName ?? "-"}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {nextActions(order.kitchenStatus).map((action) => (
          <button
            key={action.status}
            onClick={() => onStatusChange(order, action.status)}
            disabled={disabled || isUpdating}
            className="h-11 rounded-md bg-[var(--primary)] px-3 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUpdating ? "Updating..." : action.label}
          </button>
        ))}
      </div>
    </article>
  );
}

function KitchenContent() {
  const { logout, loading, user } = useAuth();
  const [board, setBoard] = useState<KitchenBoardRecord>({
    received: [],
    preparing: [],
    ready: [],
  });
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const totalOrders = useMemo(
    () => board.received.length + board.preparing.length + board.ready.length,
    [board],
  );

  const loadBoard = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setLoadingBoard(true);
    setError(null);

    try {
      const response = await fetch("/api/kitchen/orders");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load kitchen orders.");
      setBoard(data.board);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load kitchen orders.");
    } finally {
      if (!options.silent) setLoadingBoard(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsOnline(window.navigator.onLine);
      void loadBoard();
    }, 0);

    function handleOnline() {
      setIsOnline(true);
      void loadBoard();
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
  }, [loadBoard]);

  useEffect(() => {
    function refreshSilently() {
      if (!window.navigator.onLine || document.visibilityState !== "visible") return;
      void loadBoard({ silent: true });
    }

    const interval = window.setInterval(refreshSilently, 5_000);
    window.addEventListener("focus", refreshSilently);
    document.addEventListener("visibilitychange", refreshSilently);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshSilently);
      document.removeEventListener("visibilitychange", refreshSilently);
    };
  }, [loadBoard]);

  async function updateStatus(order: KitchenQueueRecord, status: KitchenStatus) {
    if (!isOnline) return;
    setUpdatingOrderId(order.id);
    setError(null);

    try {
      const response = await fetch(`/api/kitchen/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to update order status.");
      await loadBoard({ silent: true });
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unable to update order status.");
      void loadBoard({ silent: true });
    } finally {
      setUpdatingOrderId(null);
    }
  }

  const header = (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)] p-4">
      <div>
        <p className="text-sm text-[var(--muted-foreground)]">
          {user?.role === "admin" ? "Admin" : "Cashier"}
        </p>
        <h1 className="text-xl font-semibold">Kitchen Display</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md border px-3 py-2 text-sm font-medium ${isOnline ? "border-[var(--success)]/30 bg-green-50 text-[var(--success)]" : "border-[var(--warning)]/30 bg-orange-50 text-[var(--warning)]"}`}>
          {isOnline ? "Online" : "Offline"}
        </span>
        <Link href="/queue" className="grid h-11 place-items-center rounded-md border border-[var(--border)] px-4 font-medium hover:bg-[var(--muted)]">
          Queue
        </Link>
        <Link href={user?.role === "admin" ? "/dashboard" : "/pos"} className="grid h-11 place-items-center rounded-md border border-[var(--border)] px-4 font-medium hover:bg-[var(--muted)]">
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

  const body = (
    <>
      {!isOnline ? (
        <div className="border-b border-[var(--warning)]/30 bg-orange-50 px-4 py-2 text-sm text-[var(--warning)]">
          Connection lost. Kitchen status actions are disabled until reconnect.
        </div>
      ) : null}

      <section className="min-w-0 p-4 lg:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Active Kitchen Orders</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {totalOrders} active order(s)
            </p>
          </div>
          <button
            onClick={() => loadBoard()}
            disabled={loadingBoard || !isOnline}
            className="h-11 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-md border border-[var(--danger)]/30 bg-red-50 p-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        ) : null}

        {loadingBoard ? (
          <div className="grid min-w-0 gap-3 lg:grid-cols-3">
            {columns.map((column) => (
              <div key={column.key} className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--card)] p-3">
                <div className="h-5 w-28 rounded-md bg-[var(--muted)]" />
                <div className="mt-3 grid gap-2">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="h-40 rounded-md bg-[var(--muted)]" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : totalOrders === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center text-[var(--muted-foreground)]">
            No active kitchen orders.
          </div>
        ) : (
          <div className="grid min-w-0 gap-3 lg:grid-cols-3">
            {columns.map((column) => (
              <section key={column.key} className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--surface-alt)] p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{column.title}</h3>
                  <span className="rounded-md bg-[var(--card)] px-2 py-1 text-xs font-medium text-[var(--muted-foreground)]">
                    {board[column.key].length}
                  </span>
                </div>
                <div className="grid gap-3">
                  {board[column.key].length === 0 ? (
                    <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted-foreground)]">
                      {column.empty}
                    </div>
                  ) : (
                    board[column.key].map((order) => (
                      <KitchenOrderCard
                        key={order.id}
                        order={order}
                        disabled={!isOnline}
                        updatingStatus={updatingOrderId}
                        onStatusChange={updateStatus}
                      />
                    ))
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </>
  );

  if (user?.role === "admin") {
    return (
      <AdminShell title="Kitchen Display" eyebrow="Operations">
        {body}
      </AdminShell>
    );
  }

  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      {header}
      {body}
    </main>
  );
}

export default function KitchenPage() {
  return (
    <RoleGuard allowedRoles={["admin", "cashier"]}>
      <KitchenContent />
    </RoleGuard>
  );
}
