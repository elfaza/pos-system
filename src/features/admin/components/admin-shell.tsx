"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import RoleGuard from "@/features/auth/components/role-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/pos", label: "POS", opensInNewTab: true },
  { href: "/orders", label: "Orders" },
  { href: "/kitchen", label: "Kitchen" },
  { href: "/queue", label: "Queue", opensInNewTab: true },
  { href: "/dashboard/categories", label: "Categories" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/inventory", label: "Inventory" },
  { href: "/dashboard/accounting", label: "Accounting" },
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
  const pathname = usePathname();

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/70 bg-white/85 px-4 py-3 shadow-[0_1px_10px_rgba(20,32,51,0.08)] backdrop-blur lg:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
              {eyebrow}
            </p>
            <h1 className="break-words text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
            <span className="hidden text-sm text-[var(--muted-foreground)] sm:inline">
              {user?.name}
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

        <div className="lg:grid lg:min-h-[calc(100dvh-69px)] lg:grid-cols-[248px_1fr]">
          <aside className="border-b border-[var(--border)] bg-[#152238] p-3 text-white lg:sticky lg:top-[69px] lg:h-[calc(100dvh-69px)] lg:overflow-y-auto lg:border-b-0 lg:p-4">
            <nav className="flex gap-2 overflow-x-auto lg:grid lg:gap-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const className = `whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-white/80 ${
                  isActive
                    ? "bg-white text-[#152238] shadow-[0_8px_18px_rgba(0,0,0,0.18)]"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`;

                if (item.opensInNewTab) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={className}
                    >
                      {item.label}
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={className}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <section className="min-w-0 p-4 lg:p-6">{children}</section>
        </div>
      </main>
    </RoleGuard>
  );
}
