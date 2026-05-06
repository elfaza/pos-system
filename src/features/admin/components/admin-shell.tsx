"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import RoleGuard from "@/features/auth/components/role-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { ModuleAvailability } from "@/features/auth/types";

type OptionalModuleKey = "kitchen" | "queue" | "inventory" | "accounting";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/pos", label: "POS", opensInNewTab: true },
  { href: "/orders", label: "Orders" },
  { href: "/kitchen", label: "Kitchen", moduleKey: "kitchen" },
  { href: "/queue", label: "Queue", opensInNewTab: true, moduleKey: "queue" },
  { href: "/dashboard/categories", label: "Categories" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/inventory", label: "Inventory", moduleKey: "inventory" },
  { href: "/dashboard/accounting", label: "Accounting", moduleKey: "accounting" },
  { href: "/dashboard/users", label: "Users" },
  { href: "/dashboard/settings", label: "Settings" },
] satisfies Array<{
  href: string;
  label: string;
  opensInNewTab?: boolean;
  moduleKey?: OptionalModuleKey;
}>;

function isModuleEnabled(settings: ModuleAvailability | null, moduleKey?: OptionalModuleKey) {
  if (!moduleKey) return true;
  if (!settings) return false;

  if (moduleKey === "kitchen") return settings.kitchenEnabled;
  if (moduleKey === "queue") return settings.queueEnabled;
  if (moduleKey === "inventory") return settings.inventoryEnabled;
  return settings.accountingEnabled;
}

function DisabledModuleState({ label }: { label: string }) {
  return (
    <div className="max-w-3xl rounded-md border border-[var(--border)] bg-[var(--card)] p-4">
      <h2 className="font-semibold">{label} is disabled</h2>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Enable this module in Settings before using this workspace.
      </p>
    </div>
  );
}

function ModuleAvailabilityLoadingState({ label }: { label: string }) {
  return (
    <div className="max-w-3xl rounded-md border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="h-5 w-48 rounded-md bg-[var(--muted)]" />
      <p className="mt-3 text-sm text-[var(--muted-foreground)]">
        Checking {label.toLowerCase()} module availability...
      </p>
    </div>
  );
}

export default function AdminShell({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  const {
    logout,
    loading,
    moduleAvailability: initialModuleAvailability,
    setModuleAvailability: setInitialModuleAvailability,
    user,
  } = useAuth();
  const pathname = usePathname();
  const [moduleAvailability, setModuleAvailability] = useState<ModuleAvailability | null>(
    initialModuleAvailability,
  );
  const [moduleAvailabilityLoading, setModuleAvailabilityLoading] = useState(
    !initialModuleAvailability,
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadModuleAvailability() {
      try {
        const response = await fetch("/api/settings", { signal: controller.signal });
        const data = await response.json();
        if (response.ok) {
          const nextAvailability = {
            kitchenEnabled: data.settings?.kitchenEnabled ?? true,
            queueEnabled: data.settings?.queueEnabled ?? true,
            inventoryEnabled: data.settings?.inventoryEnabled ?? true,
            accountingEnabled: data.settings?.accountingEnabled ?? true,
          };
          setModuleAvailability(nextAvailability);
          setInitialModuleAvailability(nextAvailability);
        }
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setModuleAvailability(null);
      } finally {
        setModuleAvailabilityLoading(false);
      }
    }

    void loadModuleAvailability();

    return () => controller.abort();
  }, [setInitialModuleAvailability]);

  const currentModuleItem = navItems.find(
    (item) =>
      item.moduleKey &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
  const disabledCurrentItem = navItems.find(
    (item) =>
      item.moduleKey &&
      !isModuleEnabled(moduleAvailability, item.moduleKey) &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );

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
                if (!isModuleEnabled(moduleAvailability, item.moduleKey)) return null;

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
          <section className="min-w-0 p-4 lg:p-6">
            {currentModuleItem && moduleAvailabilityLoading ? (
              <ModuleAvailabilityLoadingState label={currentModuleItem.label} />
            ) : disabledCurrentItem ? (
              <DisabledModuleState label={disabledCurrentItem.label} />
            ) : (
              children
            )}
          </section>
        </div>
      </main>
    </RoleGuard>
  );
}
