import type { UserRole } from "../types";

export function getDefaultRouteForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/dashboard";
    case "cashier":
      return "/pos";
    case "kitchen":
      return "/kitchen";
    case "queue":
      return "/queue";
    case "customer_facing_display":
      return "/customer-display";
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "cashier":
      return "Cashier";
    case "kitchen":
      return "Kitchen";
    case "queue":
      return "Queue";
    case "customer_facing_display":
      return "Customer display";
  }
}

export function isDisplayRole(role: UserRole): boolean {
  return role === "kitchen" || role === "queue" || role === "customer_facing_display";
}

export const KITCHEN_ACCESS_ROLES = ["admin", "cashier", "kitchen"] as const satisfies readonly UserRole[];

export const QUEUE_ACCESS_ROLES = ["admin", "cashier", "queue"] as const satisfies readonly UserRole[];

export const CUSTOMER_DISPLAY_ACCESS_ROLES = [
  "admin",
  "cashier",
  "customer_facing_display",
] as const satisfies readonly UserRole[];

export const CUSTOMER_DISPLAY_WRITE_ROLES = ["admin", "cashier"] as const satisfies readonly UserRole[];
