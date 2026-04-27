"use client";

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
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="p-4 text-sm text-[var(--muted-foreground)]">Loading...</p>;
  }

  if (!user) {
    return null;
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
