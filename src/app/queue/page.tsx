"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RoleGuard from "@/features/auth/components/role-guard";
import { QUEUE_ACCESS_ROLES } from "@/features/auth/utils/role-routes";
import { useAuth } from "@/features/auth/hooks/use-auth";
import OutletSwitcher from "@/features/organizations/components/outlet-switcher";
import type { KitchenQueueRecord, QueueDisplayRecord } from "@/features/kitchen/types";

function formatOrderType(orderType: KitchenQueueRecord["orderType"]) {
  if (orderType === "dine_in") return "DINE IN";
  if (orderType === "delivery") return "DELIVERY";
  return "TAKE AWAY";
}

function QueueSkeleton() {
  return (
    <div className="flex-grow grid grid-cols-1 md:grid-cols-[3fr_4fr_3fr] gap-6 px-6 pb-6 min-h-0 animate-pulse">
      {/* Left Column Skeleton */}
      <div className="flex flex-col h-full gap-4">
        <div className="h-16 bg-slate-200 rounded-xl" />
        <div className="flex-1 bg-slate-100 rounded-xl" />
      </div>
      {/* Middle Column Skeleton */}
      <div className="flex flex-col h-full gap-4">
        <div className="h-16 bg-slate-200 rounded-xl" />
        <div className="flex-1 bg-slate-100 rounded-xl" />
      </div>
      {/* Right Column Skeleton */}
      <div className="flex flex-col h-full gap-4">
        <div className="h-16 bg-slate-200 rounded-xl" />
        <div className="flex-1 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

function QueueContent() {
  const { logout, loading } = useAuth();
  const [queue, setQueue] = useState<QueueDisplayRecord>({
    waiting: [],
    preparing: [],
    ready: [],
  });
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [now, setNow] = useState<Date | null>(null);

  // Live Digital Clock
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      setNow(new Date());
    }, 0);

    const clockTimer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(clockTimer);
    };
  }, []);

  const formattedDateTime = useMemo(() => {
    if (!now) return "";
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const dayName = days[now.getDay()];
    const date = now.getDate();
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();
    
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    
    return `${dayName}, ${date} ${monthName} ${year} - ${hours}:${minutes}:${seconds}`;
  }, [now]);

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

  // Sync state & data
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

  // Polling every 5s
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

  // Process data for the 3 columns
  const sortedWaiting = useMemo(() => {
    return [...queue.waiting].sort((a, b) => a.queueNumber - b.queueNumber);
  }, [queue.waiting]);

  const sortedPreparing = useMemo(() => {
    return [...queue.preparing].sort((a, b) => a.queueNumber - b.queueNumber);
  }, [queue.preparing]);

  const sortedReady = useMemo(() => {
    return [...queue.ready].sort((a, b) => {
      const aTime = a.kitchenReadyAt ? new Date(a.kitchenReadyAt).getTime() : 0;
      const bTime = b.kitchenReadyAt ? new Date(b.kitchenReadyAt).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime; // Newest ready first
      return b.queueNumber - a.queueNumber; // Fallback descending
    });
  }, [queue.ready]);

  return (
    <main className="h-screen flex flex-col bg-[#F3F6FB] overflow-hidden select-none relative font-sans text-slate-800">
      {/* Sleek Top Time Header */}
      <header className="bg-slate-900 text-white flex items-center justify-between gap-4 px-6 py-4 shadow-md z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-extrabold tracking-wider text-sm text-slate-300 truncate">TV MONITOR DISPLAY</span>
        </div>
        <div className="text-lg md:text-xl font-bold tracking-widest text-slate-100 tabular-nums text-center">
          {formattedDateTime}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <OutletSwitcher />
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isOnline ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400 animate-pulse"}`}>
            {isOnline ? "CONNECTED" : "OFFLINE"}
          </span>
          <button
            onClick={() => loadQueue()}
            disabled={loadingQueue || !isOnline}
            className="h-10 rounded-lg border border-slate-600 bg-slate-800 px-4 text-xs font-bold uppercase tracking-wide text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            title="Refresh Queue"
          >
            Refresh
          </button>
          <button
            onClick={logout}
            disabled={loading}
            className="h-10 rounded-lg border border-slate-600 bg-slate-800 px-4 text-xs font-bold uppercase tracking-wide text-slate-200 hover:bg-rose-950 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
            title="Sign Out"
          >
            {loading ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </header>

      {/* Connection Warning Banner */}
      {!isOnline && (
        <div className="bg-rose-500 text-white px-6 py-2 text-center text-sm font-semibold tracking-wide shadow-inner shrink-0">
          Connection lost! Waiting to reconnect...
        </div>
      )}

      {error && (
        <div className="bg-rose-100 border-b border-rose-200 text-rose-800 px-6 py-2 text-center text-sm font-medium shrink-0">
          {error}
        </div>
      )}

      {/* Main 3 Column Section */}
      {loadingQueue ? (
        <div className="flex-1 flex flex-col justify-center pt-6">
          <QueueSkeleton />
        </div>
      ) : (
        <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 px-6 py-4 min-h-0 overflow-hidden">
          
          {/* Column 1: Waiting */}
          <section className="flex flex-col h-full min-h-0">
            <h2 className="bg-indigo-600 text-white font-black text-2xl py-4 rounded-xl text-center shadow-md uppercase tracking-wider shrink-0 select-none">
              Waiting
            </h2>
            <div className="flex-1 overflow-y-auto py-4 pr-1 flex flex-col gap-3 min-h-0 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              {sortedWaiting.length === 0 ? (
                <div className="flex-grow border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center p-8 text-center text-slate-400 font-bold">
                  No waiting orders
                </div>
              ) : (
                sortedWaiting.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center gap-6 bg-white border border-slate-200/80 rounded-xl px-6 py-5 shadow-sm hover:border-indigo-300 transition-colors"
                  >
                    <span className="text-4xl font-black text-slate-800 tabular-nums">
                      {order.queueNumber}
                    </span>
                    <span className="text-sm font-black tracking-widest text-slate-400 uppercase">
                      {formatOrderType(order.orderType)}
                    </span>
                  </div>
                ))
              )}
            </div>
            
            {/* Column 1 Footer Banner */}
            <div className="flex items-center gap-4 bg-indigo-600 text-white rounded-xl p-4 shadow-md shrink-0">
              <div className="bg-white text-indigo-600 font-black text-2xl px-4 py-1.5 rounded-lg flex items-center justify-center min-w-[3rem] tabular-nums">
                {sortedWaiting.length}
              </div>
              <div className="font-extrabold text-base md:text-lg tracking-wider uppercase select-none">
                Orders Waiting
              </div>
            </div>
          </section>

          {/* Column 2: Preparing */}
          <section className="flex flex-col h-full min-h-0">
            <h2 className="bg-amber-500 text-white font-black text-2xl py-4 rounded-xl text-center shadow-md uppercase tracking-wider shrink-0 select-none">
              Preparing
            </h2>
            <div className="flex-1 overflow-y-auto py-4 pr-1 flex flex-col gap-3 min-h-0 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              {sortedPreparing.length === 0 ? (
                <div className="flex-grow border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center p-8 text-center text-slate-400 font-bold">
                  No preparing orders
                </div>
              ) : (
                sortedPreparing.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center gap-6 bg-white border border-slate-200/80 rounded-xl px-6 py-5 shadow-sm hover:border-amber-300 transition-colors"
                  >
                    <span className="text-4xl font-black text-slate-800 tabular-nums">
                      {order.queueNumber}
                    </span>
                    <span className="text-sm font-black tracking-widest text-slate-400 uppercase">
                      {formatOrderType(order.orderType)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Column 2 Footer Banner */}
            <div className="flex items-center gap-4 bg-amber-500 text-white rounded-xl p-4 shadow-md shrink-0">
              <div className="bg-white text-amber-500 font-black text-2xl px-4 py-1.5 rounded-lg flex items-center justify-center min-w-[3rem] tabular-nums">
                {sortedPreparing.length}
              </div>
              <div className="font-extrabold text-base md:text-lg tracking-wider uppercase select-none">
                Orders Preparing
              </div>
            </div>
          </section>

          {/* Column 3: Ready */}
          <section className="flex flex-col h-full min-h-0">
            <h2 className="bg-emerald-600 text-white font-black text-2xl py-4 rounded-xl text-center shadow-md uppercase tracking-wider shrink-0 select-none">
              Ready
            </h2>
            <div className="flex-1 overflow-y-auto py-4 pr-1 flex flex-col gap-3 min-h-0 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              {sortedReady.length === 0 ? (
                <div className="flex-grow border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center p-8 text-center text-slate-400 font-bold">
                  No ready orders
                </div>
              ) : (
                sortedReady.map((order, index) => (
                  <div
                    key={order.id}
                    className={`flex items-center gap-6 bg-white border border-slate-200/80 rounded-xl px-6 py-5 shadow-sm hover:border-emerald-300 transition-colors ${
                      index === 0 ? "border-emerald-400 bg-emerald-50/20 ring-2 ring-emerald-500/20" : ""
                    }`}
                  >
                    <span className={`text-4xl font-black tabular-nums ${index === 0 ? "text-emerald-600 scale-105" : "text-slate-800"}`}>
                      {order.queueNumber}
                    </span>
                    <span className={`text-sm font-black tracking-widest uppercase ${index === 0 ? "text-emerald-500" : "text-slate-400"}`}>
                      {formatOrderType(order.orderType)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Column 3 Footer Banner */}
            <div className="flex items-center gap-4 bg-emerald-600 text-white rounded-xl p-4 shadow-md shrink-0">
              <div className="bg-white text-emerald-600 font-black text-2xl px-4 py-1.5 rounded-lg flex items-center justify-center min-w-[3rem] tabular-nums">
                {sortedReady.length}
              </div>
              <div className="font-extrabold text-base md:text-lg tracking-wider uppercase select-none">
                Orders Ready
              </div>
            </div>
          </section>

        </div>
      )}

    </main>
  );
}

export default function QueuePage() {
  return (
    <RoleGuard allowedRoles={[...QUEUE_ACCESS_ROLES]}>
      <QueueContent />
    </RoleGuard>
  );
}

