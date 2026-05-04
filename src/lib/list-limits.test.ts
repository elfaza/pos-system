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
  userFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: { findMany: mocks.categoryFindMany },
    ingredient: {
      fields: { lowStockThreshold: "lowStockThreshold" },
      findMany: mocks.ingredientFindMany,
    },
    order: { findMany: mocks.orderFindMany },
    product: { findMany: mocks.productFindMany },
    user: { findMany: mocks.userFindMany },
  },
}));

describe("repository list limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.categoryFindMany.mockResolvedValue([]);
    mocks.ingredientFindMany.mockResolvedValue([]);
    mocks.orderFindMany.mockResolvedValue([]);
    mocks.productFindMany.mockResolvedValue([]);
    mocks.userFindMany.mockResolvedValue([]);
  });

  it("caps product lists used by POS and catalog management", async () => {
    await listProducts({ includeUnavailable: false });

    expect(mocks.productFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: productListLimit }),
    );
  });

  it("caps held orders while preserving cashier ownership filtering", async () => {
    await listHeldOrdersForUser({
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
    await listActiveKitchenOrders();
    await listReadyQueueOrders();

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
    await listIngredients({});
    await listCategories(false);
    await listUsers();
    await listOrdersForUser({ id: "admin-1", role: "admin" });

    expect(mocks.ingredientFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: ingredientListLimit }),
    );
    expect(mocks.categoryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: categoryListLimit }),
    );
    expect(mocks.userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: userListLimit }),
    );
    expect(mocks.orderFindMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });
});
