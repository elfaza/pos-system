import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteUnusedIngredient } from "./inventory-repository";

const mocks = vi.hoisted(() => ({
  deleteMany: vi.fn(),
  findUnique: vi.fn(),
  logCreate: vi.fn(),
  lock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({
      $queryRaw: mocks.lock,
      ingredient: { deleteMany: mocks.deleteMany, findUnique: mocks.findUnique },
      activityLog: { create: mocks.logCreate },
    }),
  },
}));

describe("ingredient deletion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("guards stock and all recipe/history references on the delete query", async () => {
    mocks.deleteMany.mockResolvedValueOnce({ count: 1 });
    await expect(deleteUnusedIngredient("ingredient-1", "admin-1")).resolves.toBe("deleted");
    expect(mocks.lock.mock.calls[0][1]).toBe("ingredient-1");
    expect(mocks.lock.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteMany.mock.invocationCallOrder[0],
    );
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "ingredient-1",
        currentStock: 0,
        productIngredients: { none: {} },
        optionValueIngredients: { none: {} },
        optionValueReplacementSources: { none: {} },
        optionValueReplacementTargets: { none: {} },
        stockMovements: { none: {} },
      },
    });
    expect(mocks.logCreate).toHaveBeenCalledWith({
      data: {
        userId: "admin-1", action: "ingredient.deleted",
        entityType: "ingredient", entityId: "ingredient-1",
      },
    });
  });

  it("does not log a blocked deletion", async () => {
    mocks.deleteMany.mockResolvedValueOnce({ count: 0 });
    mocks.findUnique.mockResolvedValueOnce({ id: "ingredient-1" });
    await expect(deleteUnusedIngredient("ingredient-1", "admin-1")).resolves.toBe("in_use");
    expect(mocks.logCreate).not.toHaveBeenCalled();
  });

  it("distinguishes a missing ingredient from one still in use", async () => {
    mocks.deleteMany.mockResolvedValueOnce({ count: 0 });
    mocks.findUnique.mockResolvedValueOnce(null);
    await expect(deleteUnusedIngredient("missing", "admin-1")).resolves.toBe("not_found");
    expect(mocks.logCreate).not.toHaveBeenCalled();
  });
});
