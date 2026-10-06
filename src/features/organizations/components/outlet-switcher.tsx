"use client";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { useOutletSwitch } from "@/features/organizations/hooks/use-outlet-switch";

export default function OutletSwitcher({ selectionRequired = false }: { selectionRequired?: boolean }) {
  const { tenantResolution } = useAuth();
  const { switchOutlet, pendingOutletId, error } = useOutletSwitch();

  if (tenantResolution.status === "no_access") return null;
  const { outlets } = tenantResolution;
  if (!selectionRequired && (outlets.length < 2 || tenantResolution.status !== "ready")) return null;

  const currentOutletId = tenantResolution.status === "ready" ? tenantResolution.context.outletId : null;

  return (
    <section className={selectionRequired
      ? "mx-auto w-full max-w-xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
      : "min-w-0"}>
      <label className={selectionRequired ? "block text-sm font-semibold" : "sr-only"} htmlFor="active-outlet">
        {selectionRequired ? "Choose an outlet to continue" : "Active outlet"}
      </label>
      <select
        id="active-outlet"
        aria-label="Active outlet"
        value={currentOutletId ?? ""}
        disabled={pendingOutletId !== null}
        onChange={(event) => { if (event.target.value) void switchOutlet(event.target.value); }}
        className={selectionRequired
          ? "mt-3 h-12 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm"
          : "h-10 w-[min(18rem,55vw)] min-w-36 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-sm text-[var(--foreground)] shadow-sm transition-colors hover:border-[var(--primary)]/40 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"}
      >
        {tenantResolution.status === "outlet_required" ? <option value="">Select outlet</option> : null}
        {outlets.map((outlet) => (
          <option key={`${outlet.organizationId}:${outlet.outletId}`} value={outlet.outletId}>
            {outlet.organizationName} · {outlet.outletName}
          </option>
        ))}
      </select>
      {pendingOutletId ? <span role="status" className="text-xs text-[var(--muted-foreground)]">Switching…</span> : null}
      {error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}
    </section>
  );
}
