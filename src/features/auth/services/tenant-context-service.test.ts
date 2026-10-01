import { describe, expect, it } from "vitest";
import { resolveTenantContext, type TenantMembershipDTO } from "./tenant-context-service";

function memberships(overrides: Partial<TenantMembershipDTO> = {}): TenantMembershipDTO {
  return {
    organizationMemberships: [],
    outletMemberships: [],
    ...overrides,
  };
}

describe("tenant context resolution", () => {
  it("selects a user's sole active outlet automatically", () => {
    const result = resolveTenantContext("user-1", memberships({
      outletMemberships: [{
        organizationId: "org-1", outletId: "outlet-1", role: "cashier", isActive: true,
        outlet: {
          id: "outlet-1", name: "Main", isActive: true,
          organization: { id: "org-1", name: "Cafe", isActive: true },
        },
      }],
    }));

    expect(result).toMatchObject({
      status: "ready",
      context: { userId: "user-1", organizationId: "org-1", outletId: "outlet-1", role: "cashier" },
    });
  });

  it("grants an active owner access to all active outlets and honors a valid selection", () => {
    const data = memberships({
      organizationMemberships: [{
        organizationId: "org-1", role: "owner", isActive: true,
        organization: {
          id: "org-1", name: "Cafe", isActive: true,
          outlets: [
            { id: "outlet-b", name: "Branch B", isActive: true },
            { id: "outlet-a", name: "Branch A", isActive: true },
            { id: "outlet-off", name: "Closed", isActive: false },
          ],
        },
      }],
    });

    const result = resolveTenantContext("owner-1", data, { organizationId: "org-1", outletId: "outlet-b" });
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.context).toEqual({ userId: "owner-1", organizationId: "org-1", outletId: "outlet-b", role: "owner" });
    expect(result.outlets.map(({ outletId }) => outletId)).toEqual(["outlet-a", "outlet-b"]);
  });

  it("keeps direct outlet access scoped to that membership", () => {
    const result = resolveTenantContext("user-1", memberships({
      outletMemberships: [{
        organizationId: "org-1", outletId: "outlet-1", role: "kitchen", isActive: true,
        outlet: {
          id: "outlet-1", name: "Kitchen Outlet", isActive: true,
          organization: { id: "org-1", name: "Cafe", isActive: true },
        },
      }],
    }));

    expect(result.status).toBe("ready");
    if (result.status === "ready") expect(result.context.role).toBe("kitchen");
  });

  it("ignores inactive memberships, organizations, and outlets", () => {
    const result = resolveTenantContext("user-1", memberships({
      organizationMemberships: [{
        organizationId: "org-off", role: "owner", isActive: false,
        organization: { id: "org-off", name: "Inactive", isActive: true, outlets: [{ id: "outlet-a", name: "A", isActive: true }] },
      }, {
        organizationId: "org-2", role: "owner", isActive: true,
        organization: { id: "org-2", name: "Inactive", isActive: false, outlets: [{ id: "outlet-b", name: "B", isActive: true }] },
      }],
      outletMemberships: [{
        organizationId: "org-3", outletId: "outlet-c", role: "cashier", isActive: true,
        outlet: { id: "outlet-c", name: "Closed", isActive: false, organization: { id: "org-3", name: "Cafe", isActive: true } },
      }],
    }));

    expect(result).toEqual({ status: "no_access", outlets: [] });
  });

  it("requires selection when multiple outlets are available and the saved selection is stale", () => {
    const result = resolveTenantContext("owner-1", memberships({
      organizationMemberships: [{
        organizationId: "org-1", role: "owner", isActive: true,
        organization: {
          id: "org-1", name: "Cafe", isActive: true,
          outlets: [{ id: "outlet-1", name: "A", isActive: true }, { id: "outlet-2", name: "B", isActive: true }],
        },
      }],
    }), { organizationId: "org-foreign", outletId: "outlet-foreign" });

    expect(result.status).toBe("outlet_required");
  });

  it("returns no access when the user has no usable membership", () => {
    expect(resolveTenantContext("user-1", memberships())).toEqual({ status: "no_access", outlets: [] });
  });
});
