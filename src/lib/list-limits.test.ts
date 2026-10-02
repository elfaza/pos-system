import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  heldOrderListLimit,
  listHeldOrdersForUser,
  listOrdersForUser,
} from "@/features/checkout/repositories/order-repository";
import {
  activeKitchenOrderLimit,
  listActiveKitchenOrders,
  listReadyQueueOrders,
} from "@/features/kitchen/repositories/kitchen-repository";
import {
  ingredientListLimit,
  listIngredients,
} from "@/features/inventory/repositories/inventory-repository";
import {
  listProducts,
  productListLimit,
} from "@/features/catalog/repositories/product-repository";
import {
  categoryListLimit,
  listCategories,
} from "@/features/catalog/repositories/category-repository";
import {
  listUsers,
  userListLimit,
} from "@/features/auth/repositories/user-repository";

const mocks = vi.hoisted(() => ({
  categoryFindMany: vi.fn(),
  ingredientFindMany: vi.fn(),
  orderFindMany: vi.fn(),
  productFindMany: vi.fn(),
  membershipFindMany: vi.fn(),
  queryRaw: vi.fn(),
  transaction: vi.fn(),
}));

mocks.transaction.mockImplementation(async (callback) => callback({
  $queryRaw: vi.fn().mockResolvedValue([]),
  ingredient: { findMany: mocks.ingredientFindMany },
  order: { findMany: mocks.orderFindMany },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    category: { findMany: mocks.categoryFindMany },
    ingredient: {
      fields: { lowStockThreshold: "lowStockThreshold" },
      findMany: mocks.ingredientFindMany,
    },
    order: { findMany: mocks.orderFindMany },
    product: { findMany: mocks.productFindMany },
    outletMembership: { findMany: mocks.membershipFindMany },
  },
}));

describe("repository list limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.categoryFindMany.mockResolvedValue([]);
    mocks.ingredientFindMany.mockResolvedValue([]);
    mocks.orderFindMany.mockResolvedValue([]);
    mocks.productFindMany.mockResolvedValue([]);
    mocks.membershipFindMany.mockResolvedValue([]);
  });

  it("caps product lists used by POS and catalog management", async () => {
    await listProducts(
      { product: { findMany: mocks.productFindMany } } as never,
      "org-1",
      "outlet-1",
      { includeUnavailable: false },
    );

    expect(mocks.productFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: productListLimit }),
    );
  });

  it("caps held orders while preserving cashier ownership filtering", async () => {
    await listHeldOrdersForUser({ organizationId: "org-1", outletId: "outlet-1", userId: "cashier-1", role: "cashier" }, {
      id: "cashier-1",
      role: "cashier",
    });

    expect(mocks.orderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: heldOrderListLimit,
        where: expect.objectContaining({ cashierId: "cashier-1" }),
      }),
    );
  });

  it("caps active kitchen and queue display lists", async () => {
    const tenant = { organizationId: "org-1", outletId: "outlet-1", userId: "kitchen-1", role: "kitchen" as const };
    await listActiveKitchenOrders(tenant);
    await listReadyQueueOrders(tenant);

    expect(mocks.orderFindMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ take: activeKitchenOrderLimit }),
    );
    expect(mocks.orderFindMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ take: activeKitchenOrderLimit }),
    );
  });

  it("caps ingredient, category, user, and order history lists", async () => {
    mocks.ingredientFindMany.mockResolvedValue(Array.from({ length: ingredientListLimit + 1 }, (_, index) => ({
      id: `ingredient-${index}`,
      organizationId: "org-1",
      name: `Ingredient ${index}`,
      sku: null,
      unit: "each",
      currentStock: 0,
      lowStockThreshold: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      outletStocks: [],
    })));
    const ingredients = await listIngredients({ organizationId: "org-1", outletId: "outlet-1", userId: "user-1", role: "admin" }, {});
    await listCategories({ category: { findMany: mocks.categoryFindMany } } as never, "org-1", false);
    await listUsers({ organizationId: "org-1", outletId: "outlet-1", userId: "admin-1", role: "admin" });
    await listOrdersForUser({ organizationId: "org-1", outletId: "outlet-1", userId: "admin-1", role: "admin" }, { id: "admin-1", role: "admin" });

    expect(mocks.ingredientFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: "org-1" }),
    }));
    expect(ingredients).toHaveLength(ingredientListLimit);
    expect(mocks.categoryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: categoryListLimit }),
    );
    expect(mocks.membershipFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: userListLimit,
        where: { organizationId: "org-1", outletId: "outlet-1" },
      }),
    );
    expect(mocks.orderFindMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });
});
