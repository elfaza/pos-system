import { beforeEach, describe, expect, it, vi } from "vitest";
import { findCustomerDisplayState, upsertCustomerDisplayState } from "../repositories/customer-display-repository";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), upsert: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/tenant-prisma", () => ({
  withTenantTransaction: (_context: unknown, callback: (tx: unknown) => unknown) => callback({ customerDisplayState: { findFirst: mocks.findFirst, upsert: mocks.upsert } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const context = { userId: "display-1", organizationId: "org-a", outletId: "outlet-a", role: "customer_facing_display" as const };

describe("customer display tenant state", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads state by organization and outlet", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await findCustomerDisplayState(context);
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { organizationId: "org-a", outletId: "outlet-a" },
    });
  });

  it("creates independent outlet state rows", async () => {
    mocks.upsert.mockResolvedValue({ id: "display-state-1" });
    await upsertCustomerDisplayState({
      context,
      status: "idle",
      storeName: "Outlet A",
      payload: {},
      paidOrderNumber: null,
      paidAt: null,
    });
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId_outletId: { organizationId: "org-a", outletId: "outlet-a" } },
      create: expect.objectContaining({ organizationId: "org-a", outletId: "outlet-a" }),
    }));
  });
});
