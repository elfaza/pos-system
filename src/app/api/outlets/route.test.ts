import { describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "@/lib/api-response";
import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({ requireTenantContext: vi.fn(), listOrganizationOutlets: vi.fn(), createOrganizationOutlet: vi.fn() }));
vi.mock("@/features/auth/services/session-service", () => ({ requireTenantContext: mocks.requireTenantContext }));
vi.mock("@/features/organizations/services/organization-admin-service", () => ({
  listOrganizationOutlets: mocks.listOrganizationOutlets,
  createOrganizationOutlet: mocks.createOrganizationOutlet,
}));

describe("/api/outlets", () => {
  it("allows an owner to list outlets", async () => {
    mocks.requireTenantContext.mockResolvedValue({ organizationId: "org-1", outletId: "outlet-1", userId: "owner-1", role: "owner" });
    mocks.listOrganizationOutlets.mockResolvedValue([{ id: "outlet-1", name: "Central" }]);
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ outlets: [{ id: "outlet-1" }] });
  });

  it("lets outlet admins list only the outlet supplied by their trusted context", async () => {
    mocks.requireTenantContext.mockResolvedValue({ organizationId: "org-1", outletId: "outlet-2", userId: "admin-1", role: "admin" });
    mocks.listOrganizationOutlets.mockResolvedValue([{ id: "outlet-2", name: "Harbor" }]);
    const response = await GET();
    expect(mocks.listOrganizationOutlets).toHaveBeenCalledWith(expect.objectContaining({ outletId: "outlet-2", role: "admin" }));
    await expect(response.json()).resolves.toMatchObject({ canCreate: false, canManageOutletStructure: false, outlets: [{ id: "outlet-2" }] });
  });

  it("blocks non-owner outlet creation", async () => {
    mocks.requireTenantContext.mockRejectedValue(new ForbiddenError());
    const response = await POST(new Request("http://localhost/api/outlets", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Harbor", slug: "harbor" }),
    }));
    expect(response.status).toBe(403);
    expect(mocks.createOrganizationOutlet).not.toHaveBeenCalled();
  });
});
