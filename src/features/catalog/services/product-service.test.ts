import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, ValidationError } from "@/lib/api-response";
import {
  createProductFromPayload,
  getProductList,
  updateProductFromPayload,
} from "./product-service";

const mocks = vi.hoisted(() => ({
  activityLogCreate: vi.fn(),
  createProduct: vi.fn(),
  findProductById: vi.fn(),
  ingredientFindMany: vi.fn(),
  listProducts: vi.fn(),
  updateProduct: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    activityLog: { create: mocks.activityLogCreate },
    ingredient: { findMany: mocks.ingredientFindMany },
  },
}));

vi.mock("../repositories/product-repository", () => ({
  createProduct: mocks.createProduct,
  findProductById: mocks.findProductById,
  listProducts: mocks.listProducts,
  productListLimit: 200,
  updateProduct: mocks.updateProduct,
}));

const actor = {
  id: "admin-1",
  name: "Admin",
  email: "admin@pos.local",
  role: "admin" as const,
};

const productRecord = {
  id: "product-1",
  categoryId: "category-1",
  category: { name: "Drinks" },
  name: "Coffee",
  sku: "COF",
  description: null,
  imageUrl: null,
  price: "20000",
  costPrice: null,
  trackStock: false,
  stockQuantity: null,
  lowStockThreshold: null,
  isAvailable: true,
  variants: [],
};

describe("product service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createProduct.mockResolvedValue(productRecord);
    mocks.updateProduct.mockResolvedValue(productRecord);
    mocks.activityLogCreate.mockResolvedValue({});
    mocks.ingredientFindMany.mockResolvedValue([]);
  });

  it("creates products with normalized payload values", async () => {
    await createProductFromPayload(
      {
        categoryId: " category-1 ",
        name: " Coffee ",
        sku: " COF ",
        price: "20000",
        trackStock: false,
        stockQuantity: "99",
        variants: [
          {
            name: " Large ",
            priceDelta: "5000",
            isActive: false,
          },
        ],
      },
      actor,
    );

    expect(mocks.createProduct).toHaveBeenCalledWith({
      categoryId: "category-1",
      name: "Coffee",
      sku: "COF",
      description: null,
      imageUrl: null,
      price: "20000",
      costPrice: null,
      trackStock: false,
      stockQuantity: null,
      lowStockThreshold: null,
      isAvailable: true,
      variants: [
        {
          id: undefined,
          name: "Large",
          sku: null,
          priceDelta: "5000",
          costDelta: null,
          isActive: false,
        },
      ],
      recipes: [],
    });
    expect(mocks.activityLogCreate).toHaveBeenCalledWith({
      data: {
        userId: "admin-1",
        action: "product.created",
        entityType: "product",
        entityId: "product-1",
      },
    });
  });

  it("rejects missing required product fields and negative prices", async () => {
    await expect(
      createProductFromPayload({ categoryId: "", name: "", price: "-1" }, actor),
    ).rejects.toMatchObject({
      fieldErrors: {
        categoryId: "Category is required.",
        name: "Product name is required.",
        price: "Price must be greater than or equal to 0.",
      },
    });
    expect(mocks.createProduct).not.toHaveBeenCalled();
  });

  it("rejects variants without names", async () => {
    await expect(
      createProductFromPayload(
        {
          categoryId: "category-1",
          name: "Coffee",
          price: "20000",
          variants: [{ name: "" }],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects duplicate recipe rows for the same product or variant", async () => {
    await expect(
      createProductFromPayload(
        {
          categoryId: "category-1",
          name: "Coffee",
          price: "20000",
          recipes: [
            { ingredientId: "ingredient-1", quantityRequired: "10" },
            { ingredientId: "ingredient-1", quantityRequired: "12" },
          ],
        },
        actor,
      ),
    ).rejects.toMatchObject({
      fieldErrors: {
        "recipes.1.ingredientId":
          "This ingredient is already used for the same product or variant.",
      },
    });
  });

  it("rejects inactive ingredients in product recipes", async () => {
    mocks.ingredientFindMany.mockResolvedValue([
      { id: "ingredient-1", isActive: false },
    ]);

    await expect(
      createProductFromPayload(
        {
          categoryId: "category-1",
          name: "Coffee",
          price: "20000",
          recipes: [{ ingredientId: "ingredient-1", quantityRequired: "10" }],
        },
        actor,
      ),
    ).rejects.toMatchObject({
      fieldErrors: {
        recipes: "Recipes can only use active ingredients.",
      },
    });
    expect(mocks.createProduct).not.toHaveBeenCalled();
  });

  it("returns not found when updating a missing product", async () => {
    mocks.findProductById.mockResolvedValue(null);

    await expect(
      updateProductFromPayload(
        "missing-product",
        { categoryId: "category-1", name: "Coffee", price: "20000" },
        actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(mocks.updateProduct).not.toHaveBeenCalled();
  });

  it("passes list filters and maps empty product states", async () => {
    mocks.listProducts.mockResolvedValue([]);

    await expect(
      getProductList(
        new URL("https://pos.local/api/products?search=coffee&categoryId=category-1"),
        false,
      ),
    ).resolves.toEqual([]);
    expect(mocks.listProducts).toHaveBeenCalledWith({
      search: "coffee",
      categoryId: "category-1",
      includeUnavailable: false,
    });
  });
});
