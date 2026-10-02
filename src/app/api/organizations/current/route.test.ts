import { describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "@/lib/api-response";
import { GET, PATCH } from "./route";

const mocks = vi.hoisted(() => ({ requireTenantContext: vi.fn(), getCurrentOrganization: vi.fn(), updateCurrentOrganization: vi.fn() }));
vi.mock("@/features/auth/services/session-service", () => ({ requireTenantContext: mocks.requireTenantContext }));
vi.mock("@/features/organizations/services/organization-admin-service", () => ({
  getCurrentOrganization: mocks.getCurrentOrganization,
  updateCurrentOrganization: mocks.updateCurrentOrganization,
}));

describe("/api/organizations/current", () => {
  it("allows outlet admins to view the organization profile as read-only", async () => {
    mocks.requireTenantContext.mockResolvedValue({ organizationId: "org-1", outletId: "outlet-1", userId: "admin-1", role: "admin" });
    mocks.getCurrentOrganization.mockResolvedValue({ id: "org-1", name: "Cafe Group", slug: "cafe-group" });
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ canEdit: false, organization: { id: "org-1" } });
  });

  it("requires an owner context for profile updates", async () => {
    mocks.requireTenantContext.mockRejectedValue(new ForbiddenError());
    const response = await PATCH(new Request("http://localhost/api/organizations/current", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Updated", slug: "updated" }),
    }));
    expect(response.status).toBe(403);
    expect(mocks.updateCurrentOrganization).not.toHaveBeenCalled();
  });
});
