import { beforeEach, describe, expect, it, vi } from "vitest";
import { findKitchenOrderById, listActiveKitchenOrders, listReadyQueueOrders, updateKitchenOrderStatus } from "../repositories/kitchen-repository";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/tenant-prisma", () => ({
  withTenantTransaction: (_context: unknown, callback: (tx: unknown) => unknown) => callback({
    $queryRaw: vi.fn(), order: { findMany: mocks.findMany, findFirst: mocks.findFirst, update: mocks.update },
  }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

    const tenant = { userId: "kitchen-1", organizationId: "org-a", outletId: "outlet-a", role: "kitchen" as const };

describe("kitchen tenant scope", () => {
  beforeEach(() => vi.clearAllMocks());
  it("limits kitchen, queue, lookup, and update queries to the order outlet", async () => {
    const tx = { order: { findFirst: mocks.findFirst, update: mocks.update } };
    await listActiveKitchenOrders(tenant);
    await listReadyQueueOrders(tenant);
    await findKitchenOrderById("guessed-order", tenant, tx as never);
    await updateKitchenOrderStatus("order-a", tenant, { kitchenStatus: "ready" }, tx as never);
    for (const [args] of mocks.findMany.mock.calls) expect(args.where).toMatchObject({ organizationId: "org-a", outletId: "outlet-a" });
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "guessed-order", organizationId: "org-a", outletId: "outlet-a" }) }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "order-a", organizationId: "org-a", outletId: "outlet-a" } }));
  });
});
