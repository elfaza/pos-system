"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/features/admin/components/admin-shell";
import RoleGuard from "@/features/auth/components/role-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { KitchenQueueRecord, QueueDisplayRecord } from "@/features/kitchen/types";

function QueueNumberTile({
  order,
  tone,
}: {
  order: KitchenQueueRecord;
  tone: "neutral" | "warning" | "success";
}) {
  const className =
    tone === "success"
      ? "border-[var(--success)]/30 bg-green-50 text-[var(--success)]"
      : tone === "warning"
        ? "border-[var(--warning)]/30 bg-orange-50 text-[var(--warning)]"
        : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]";

  return (
    <div className={`min-w-0 rounded-md border p-4 text-center shadow-[0_1px_2px_rgba(20,32,51,0.08)] ${className}`}>
      <p className="max-w-full break-words text-3xl font-semibold sm:text-4xl">#{order.queueNumber}</p>
      <p className="mt-1 truncate text-sm" title={order.orderNumber}>{order.orderNumber}</p>
    </div>
  );
}

function QueueContent() {
  const { logout, loading, user } = useAuth();
  const [queue, setQueue] = useState<QueueDisplayRecord>({
    waiting: [],
    preparing: [],
    ready: [],
  });
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const totalOrders = useMemo(
    () => queue.waiting.length + queue.preparing.length + queue.ready.length,
    [queue],
  );

  const loadQueue = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setLoadingQueue(true);
    setError(null);

    try {
      const response = await fetch("/api/queue");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load queue display.");
      setQueue(data.queue);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load queue display.");
    } finally {
      if (!options.silent) setLoadingQueue(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsOnline(window.navigator.onLine);
      void loadQueue();
    }, 0);

    function handleOnline() {
      setIsOnline(true);
      void loadQueue();
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
  }, [loadQueue]);

  useEffect(() => {
    function refreshSilently() {
      if (!window.navigator.onLine || document.visibilityState !== "visible") return;
      void loadQueue({ silent: true });
    }

    const interval = window.setInterval(refreshSilently, 5_000);
    window.addEventListener("focus", refreshSilently);
    document.addEventListener("visibilitychange", refreshSilently);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshSilently);
      document.removeEventListener("visibilitychange", refreshSilently);
    };
  }, [loadQueue]);

  const header = (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)] p-4">
      <div>
        <p className="text-sm text-[var(--muted-foreground)]">
          {user?.role === "admin" ? "Admin" : "Cashier"}
        </p>
        <h1 className="text-xl font-semibold">Queue Display</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md border px-3 py-2 text-sm font-medium ${isOnline ? "border-[var(--success)]/30 bg-green-50 text-[var(--success)]" : "border-[var(--warning)]/30 bg-orange-50 text-[var(--warning)]"}`}>
          {isOnline ? "Online" : "Offline"}
        </span>
        <Link href="/kitchen" className="grid h-11 place-items-center rounded-md border border-[var(--border)] px-4 font-medium hover:bg-[var(--muted)]">
          Kitchen
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
          Connection lost. Queue display will refresh after reconnect.
        </div>
      ) : null}

      <section className="p-4 lg:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Customer Queue</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {totalOrders} active queue number(s)
            </p>
          </div>
          <button
            onClick={() => loadQueue()}
            disabled={loadingQueue || !isOnline}
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

        {loadingQueue ? (
          <div className="grid gap-4">
            <div className="h-48 rounded-md border border-[var(--border)] bg-[var(--card)]" />
            <div className="grid gap-3 md:grid-cols-2">
              <div className="h-40 rounded-md border border-[var(--border)] bg-[var(--card)]" />
              <div className="h-40 rounded-md border border-[var(--border)] bg-[var(--card)]" />
            </div>
          </div>
        ) : totalOrders === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center text-[var(--muted-foreground)]">
            No queue numbers are active.
          </div>
        ) : (
          <div className="grid gap-4">
            <section className="rounded-md border border-[var(--success)]/30 bg-green-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-[var(--success)]">Ready for Pickup</h3>
                <span className="rounded-md bg-white px-2 py-1 text-sm font-medium text-[var(--success)]">
                  {queue.ready.length}
                </span>
              </div>
              {queue.ready.length === 0 ? (
                <p className="rounded-md border border-dashed border-[var(--success)]/30 bg-white p-4 text-sm text-[var(--success)]">
                  No ready orders.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {queue.ready.map((order) => (
                    <QueueNumberTile key={order.id} order={order} tone="success" />
                  ))}
                </div>
              )}
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-md border border-[var(--border)] bg-[var(--surface-alt)] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Preparing</h3>
                  <span className="rounded-md bg-white px-2 py-1 text-sm font-medium text-[var(--muted-foreground)]">
                    {queue.preparing.length}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {queue.preparing.length === 0 ? (
                    <p className="rounded-md border border-dashed border-[var(--border)] bg-white p-4 text-sm text-[var(--muted-foreground)]">
                      No orders in prep.
                    </p>
                  ) : (
                    queue.preparing.map((order) => (
                      <QueueNumberTile key={order.id} order={order} tone="warning" />
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-md border border-[var(--border)] bg-[var(--surface-alt)] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Waiting</h3>
                  <span className="rounded-md bg-white px-2 py-1 text-sm font-medium text-[var(--muted-foreground)]">
                    {queue.waiting.length}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {queue.waiting.length === 0 ? (
                    <p className="rounded-md border border-dashed border-[var(--border)] bg-white p-4 text-sm text-[var(--muted-foreground)]">
                      No waiting orders.
                    </p>
                  ) : (
                    queue.waiting.map((order) => (
                      <QueueNumberTile key={order.id} order={order} tone="neutral" />
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </section>
    </>
  );

  if (user?.role === "admin") {
    return (
      <AdminShell title="Queue Display" eyebrow="Operations">
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

export default function QueuePage() {
  return (
    <RoleGuard allowedRoles={["admin", "cashier"]}>
      <QueueContent />
    </RoleGuard>
  );
}
