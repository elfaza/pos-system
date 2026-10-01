import { describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/api-response";
import { PUT } from "./route";

const mocks = vi.hoisted(() => ({ switchCurrentOutlet: vi.fn() }));

vi.mock("@/features/auth/services/session-service", () => ({
  switchCurrentOutlet: mocks.switchCurrentOutlet,
}));

describe("PUT /api/session/outlet", () => {
  it("requires a non-empty outlet ID", async () => {
    const response = await PUT(new Request("http://localhost/api/session/outlet", {
      method: "PUT",
      body: JSON.stringify({ outletId: " " }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(400);
    expect(mocks.switchCurrentOutlet).not.toHaveBeenCalled();
  });

  it("switches only to the outlet authorized by the session service", async () => {
    mocks.switchCurrentOutlet.mockResolvedValue({
      userId: "user-1", organizationId: "org-1", outletId: "outlet-2", role: "cashier",
    });
    const response = await PUT(new Request("http://localhost/api/session/outlet", {
      method: "PUT",
      body: JSON.stringify({ outletId: " outlet-2 ", organizationId: "org-foreign" }),
      headers: { "content-type": "application/json" },
    }));

    expect(mocks.switchCurrentOutlet).toHaveBeenCalledWith("outlet-2");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      activeOrganizationId: "org-1",
      activeOutletId: "outlet-2",
    });
  });

  it("returns the same not-found response for inaccessible outlets", async () => {
    mocks.switchCurrentOutlet.mockRejectedValue(new NotFoundError("Outlet was not found."));
    const response = await PUT(new Request("http://localhost/api/session/outlet", {
      method: "PUT",
      body: JSON.stringify({ outletId: "foreign-outlet" }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Outlet was not found." });
  });
});
