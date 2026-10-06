"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import OutletSwitcher from "./outlet-switcher";

export default function TenantExperience({ children }: { children: ReactNode }) {
  const { user, tenantResolution, logout, loading } = useAuth();

  if (user && tenantResolution.status === "outlet_required") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--background)] p-4 text-[var(--foreground)]">
        <div className="w-full max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">Workspace access</p>
          <h1 className="mt-2 text-2xl font-semibold">Choose an outlet</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Your account can access more than one outlet. Choose where you want to work.</p>
          <div className="mt-6">
            <OutletSwitcher selectionRequired />
          </div>
          <button onClick={() => void logout()} disabled={loading} className="mt-5 text-sm font-medium text-[var(--muted-foreground)] underline">
            Sign out
          </button>
        </div>
      </main>
    );
  }

  if (user && tenantResolution.status === "no_access") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--background)] p-4">
        <section className="max-w-lg rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
          <h1 className="text-xl font-semibold">No active outlet access</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Ask an organization owner to restore your membership, or sign out.</p>
          <button onClick={() => void logout()} disabled={loading} className="mt-5 h-11 rounded-lg bg-[var(--primary)] px-4 font-medium text-white disabled:opacity-60">Sign out</button>
        </section>
      </main>
    );
  }

  return children;
}
