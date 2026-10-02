import { describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "@/lib/api-response";
import { PATCH } from "./route";

const mocks = vi.hoisted(() => ({ requireTenantContext: vi.fn(), updateOrganizationOutlet: vi.fn() }));
vi.mock("@/features/auth/services/session-service", () => ({ requireTenantContext: mocks.requireTenantContext }));
vi.mock("@/features/organizations/services/organization-admin-service", () => ({ updateOrganizationOutlet: mocks.updateOrganizationOutlet }));

describe("PATCH /api/outlets/[id]", () => {
  it("scopes outlet updates to owner contexts", async () => {
    mocks.requireTenantContext.mockRejectedValue(new ForbiddenError());
    const response = await PATCH(new Request("http://localhost/api/outlets/foreign", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Renamed" }),
    }), { params: Promise.resolve({ id: "foreign" }) });
    expect(response.status).toBe(403);
    expect(mocks.updateOrganizationOutlet).not.toHaveBeenCalled();
  });
});
