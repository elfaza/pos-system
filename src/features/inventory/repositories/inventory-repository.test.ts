import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteUnusedIngredient } from "./inventory-repository";

const mocks = vi.hoisted(() => ({
  deleteMany: vi.fn(),
  findFirst: vi.fn(),
  logCreate: vi.fn(),
  lock: vi.fn(),
}));

vi.mock("@/lib/tenant-prisma", () => ({
  withTenantTransaction: async (
    _context: unknown,
    callback: (tx: unknown) => Promise<unknown>,
  ) => callback({
    $queryRaw: mocks.lock,
    ingredient: { deleteMany: mocks.deleteMany, findFirst: mocks.findFirst },
    activityLog: { create: mocks.logCreate },
  }),
}));

const tenant = {
  userId: "admin-1",
  organizationId: "org-1",
  outletId: "outlet-1",
  role: "owner" as const,
};

describe("ingredient deletion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("locks and deletes only an unused ingredient in the active organization", async () => {
    mocks.deleteMany.mockResolvedValueOnce({ count: 1 });
    await expect(deleteUnusedIngredient(tenant, "ingredient-1")).resolves.toBe("deleted");
    expect(mocks.lock.mock.calls[0][1]).toBe("ingredient-1");
    expect(mocks.lock.mock.calls[0][2]).toBe("org-1");
    expect(mocks.lock.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteMany.mock.invocationCallOrder[0],
    );
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "ingredient-1",
        organizationId: "org-1",
        outletStocks: { none: { currentStock: { not: 0 } } },
        productIngredients: { none: {} },
        optionValueIngredients: { none: {} },
        optionValueReplacementSources: { none: {} },
        optionValueReplacementTargets: { none: {} },
        stockMovements: { none: {} },
      },
    });
    expect(mocks.logCreate).toHaveBeenCalledWith({
      data: {
        userId: "admin-1",
        organizationId: "org-1",
        outletId: "outlet-1",
        action: "ingredient.deleted",
        entityType: "ingredient",
        entityId: "ingredient-1",
      },
    });
  });

  it("does not log a blocked deletion", async () => {
    mocks.deleteMany.mockResolvedValueOnce({ count: 0 });
    mocks.findFirst.mockResolvedValueOnce({ id: "ingredient-1" });
    await expect(deleteUnusedIngredient(tenant, "ingredient-1")).resolves.toBe("in_use");
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { id: "ingredient-1", organizationId: "org-1" },
      select: { id: true },
    });
    expect(mocks.logCreate).not.toHaveBeenCalled();
  });

  it("distinguishes an ingredient outside this organization from one in use", async () => {
    mocks.deleteMany.mockResolvedValueOnce({ count: 0 });
    mocks.findFirst.mockResolvedValueOnce(null);
    await expect(deleteUnusedIngredient(tenant, "foreign-ingredient")).resolves.toBe("not_found");
    expect(mocks.logCreate).not.toHaveBeenCalled();
  });
});
