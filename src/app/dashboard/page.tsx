import Link from "next/link";
import AdminShell from "@/features/admin/components/admin-shell";

export default function DashboardPage() {
  return (
    <AdminShell title="POS Management" eyebrow="Admin">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            href: "/orders",
            title: "Orders",
            body: "Review paid and held orders, then reprint receipts.",
          },
          {
            href: "/dashboard/categories",
            title: "Categories",
            body: "Create, sort, and disable POS menu categories.",
          },
          {
            href: "/dashboard/products",
            title: "Products",
            body: "Manage product prices, availability, stock tracking, and variants.",
          },
          {
            href: "/dashboard/inventory",
            title: "Inventory",
            body: "Manage ingredient stock, adjustments, waste, and low-stock alerts.",
          },
          {
            href: "/dashboard/users",
            title: "Users",
            body: "Manage admin and cashier accounts, roles, and active access.",
          },
          {
            href: "/dashboard/settings",
            title: "Settings",
            body: "Maintain store profile, tax, service charge, and receipt settings.",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4 hover:bg-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">{item.body}</p>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
