"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useAuth } from "../hooks/use-auth";
import { UserRole } from "../types";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

export default function RoleGuard({
    allowedRoles,
  children,
}: RoleGuardProps) {
  const { user, loading, loggingOut } = useAuth();

  if (loading || loggingOut) {
    return <p className="p-4 text-sm text-[var(--muted-foreground)]">Loading...</p>;
  }

  if (!user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--background)] p-4">
        <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
          <h1 className="text-lg font-semibold">Sign in required</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Your session is missing or expired.
          </p>
          <Link
            href="/"
            className="mt-4 inline-grid h-11 place-items-center rounded-md bg-[var(--primary)] px-4 font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Go to sign in
          </Link>
        </div>
      </main>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--background)] p-4">
        <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-6 text-center">
          <h1 className="text-lg font-semibold">Access denied</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Your role cannot access this page.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
