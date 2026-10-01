import { describe, expect, it } from "vitest";
import { canAccessTenantRoute, isTenantRoleAllowed } from "./tenant-role-policy";

describe("tenant role policy", () => {
  it("allows an organization owner across tenant routes", () => {
    expect(canAccessTenantRoute("owner", "organization_management")).toBe(true);
    expect(canAccessTenantRoute("owner", "accounting")).toBe(true);
    expect(isTenantRoleAllowed("owner", ["admin"])).toBe(true);
  });

  it("limits outlet administrators from organization ownership settings", () => {
    expect(canAccessTenantRoute("admin", "outlet_management")).toBe(true);
    expect(canAccessTenantRoute("admin", "organization_management")).toBe(false);
  });

  it("keeps operational roles limited to their relevant routes", () => {
    expect(canAccessTenantRoute("cashier", "pos")).toBe(true);
    expect(canAccessTenantRoute("cashier", "accounting")).toBe(false);
    expect(canAccessTenantRoute("kitchen", "kitchen")).toBe(true);
    expect(canAccessTenantRoute("kitchen", "pos")).toBe(false);
    expect(canAccessTenantRoute("queue", "queue")).toBe(true);
    expect(canAccessTenantRoute("customer_facing_display", "customer_display")).toBe(true);
  });

  it("matches legacy allowed-role lists without granting unrelated roles", () => {
    expect(isTenantRoleAllowed("cashier", ["admin", "cashier"])).toBe(true);
    expect(isTenantRoleAllowed("kitchen", ["admin", "cashier"])).toBe(false);
  });
});
