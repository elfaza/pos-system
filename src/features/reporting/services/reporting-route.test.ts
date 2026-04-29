import { describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "@/lib/api-response";

const mocks = vi.hoisted(() => ({
  getDashboardReport: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/features/auth/services/session-service", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/features/reporting/services/reporting-service", () => ({
  getDashboardReport: mocks.getDashboardReport,
}));

describe("reporting dashboard route", () => {
  it("returns forbidden when a cashier requests dashboard reports", async () => {
    mocks.requireUser.mockRejectedValue(new ForbiddenError());
    const { GET } = await import("@/app/api/reports/dashboard/route");

    const response = await GET(
      new Request("http://localhost/api/reports/dashboard?dateFrom=2026-04-29"),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "You do not have permission to perform this action.",
    });
    expect(mocks.requireUser).toHaveBeenCalledWith(["admin"]);
    expect(mocks.getDashboardReport).not.toHaveBeenCalled();
  });
});
