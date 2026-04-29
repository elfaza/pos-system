"use client";

import Link from "next/link";
import { ReactNode } from "react";
import RoleGuard from "@/features/auth/components/role-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/orders", label: "Orders" },
  { href: "/dashboard/categories", label: "Categories" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/inventory", label: "Inventory" },
  { href: "/dashboard/users", label: "Users" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function AdminShell({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  const { logout, loading, user } = useAuth();

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)] p-4">
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">{eyebrow}</p>
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[var(--muted-foreground)] sm:inline">
              {user?.name}
            </span>
            <button
              onClick={logout}
              disabled={loading}
              className="h-11 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 font-medium hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </header>

        <div className="lg:grid lg:min-h-[calc(100dvh-73px)] lg:grid-cols-[240px_1fr]">
          <aside className="border-b border-[var(--border)] bg-[var(--card)] p-3 lg:border-b-0 lg:border-r">
            <nav className="flex gap-2 overflow-x-auto lg:grid">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium hover:bg-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <section className="min-w-0 p-4 lg:p-6">{children}</section>
        </div>
      </main>
    </RoleGuard>
  );
}
