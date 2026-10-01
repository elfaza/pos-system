import type { EffectiveRole } from "../types";

export type TenantRoute =
  | "dashboard"
  | "organization_management"
  | "outlet_management"
  | "users"
  | "pos"
  | "orders"
  | "inventory"
  | "accounting"
  | "kitchen"
  | "queue"
  | "customer_display";

const routesByRole: Record<EffectiveRole, readonly TenantRoute[]> = {
  owner: [
    "dashboard", "organization_management", "outlet_management", "users",
    "pos", "orders", "inventory", "accounting", "kitchen", "queue",
    "customer_display",
  ],
  admin: [
    "dashboard", "outlet_management", "users", "pos", "orders", "inventory",
    "accounting", "kitchen", "queue", "customer_display",
  ],
  cashier: ["dashboard", "pos", "orders", "customer_display"],
  kitchen: ["dashboard", "kitchen"],
  queue: ["dashboard", "queue"],
  customer_facing_display: ["customer_display"],
};

export function canAccessTenantRoute(
  role: EffectiveRole,
  route: TenantRoute,
): boolean {
  return routesByRole[role].includes(route);
}

/** Preserve existing route guards while callers migrate from the legacy role. */
export function isTenantRoleAllowed(
  role: EffectiveRole,
  allowedRoles: readonly EffectiveRole[],
): boolean {
  return allowedRoles.includes(role) ||
    (role === "owner" && allowedRoles.includes("admin"));
}
