import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/api-response";
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
  categoryFindFirst: vi.fn(),
  listProducts: vi.fn(),
  productVariantFindMany: vi.fn(),
  updateProduct: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    activityLog: { create: mocks.activityLogCreate },
    ingredient: { findMany: mocks.ingredientFindMany },
  },
}));

vi.mock("@/lib/tenant-prisma", () => ({
  withTenantTransaction: (_context: unknown, callback: (tx: unknown) => unknown) =>
    callback({
      activityLog: { create: mocks.activityLogCreate },
      category: { findFirst: mocks.categoryFindFirst },
      ingredient: { findMany: mocks.ingredientFindMany },
      productVariant: { findMany: mocks.productVariantFindMany },
    }),
}));

vi.mock("../repositories/product-repository", () => ({
  createProduct: mocks.createProduct,
  findProductById: mocks.findProductById,
  listProducts: mocks.listProducts,
  productListLimit: 200,
  updateProduct: mocks.updateProduct,
}));

const tenant = {
  userId: "admin-1",
  organizationId: "org-1",
  outletId: "outlet-1",
  role: "owner" as const,
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
  optionGroups: [],
  ingredients: [],
};

describe("product service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createProduct.mockResolvedValue(productRecord);
    mocks.updateProduct.mockResolvedValue(productRecord);
    mocks.activityLogCreate.mockResolvedValue({});
    mocks.categoryFindFirst.mockResolvedValue({ id: "category-1" });
    mocks.productVariantFindMany.mockResolvedValue([]);
    mocks.ingredientFindMany.mockImplementation(({ where }) =>
      Promise.resolve(
        (where.id.in as string[]).map((id) => ({ id, isActive: true })),
      ),
    );
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
      },
      tenant,
    );

    expect(mocks.createProduct).toHaveBeenCalledWith(expect.anything(), "org-1", "outlet-1", {
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
      optionGroups: [],
      recipes: [],
    });
    expect(mocks.activityLogCreate).toHaveBeenCalledWith({
      data: {
        userId: "admin-1",
        organizationId: "org-1",
        outletId: "outlet-1",
        action: "product.created",
        entityType: "product",
        entityId: "product-1",
      },
    });
  });

  it("creates products with normalized option groups and values", async () => {
    await createProductFromPayload(
      {
        categoryId: "category-1",
        name: "Coffee",
        price: "20000",
        optionGroups: [
          {
            name: " Temperature ",
            selectionType: "single",
            isRequired: true,
            values: [
              { name: " Hot ", priceDelta: "0" },
              { name: " Iced ", priceDelta: "3000", isActive: false },
            ],
          },
          {
            name: " Extra topping ",
            selectionType: "multiple",
            values: [
              {
                name: " Oat milk ",
                priceDelta: "5000",
                replacementRules: [
                  {
                    replacedIngredientId: "ingredient-milk",
                    replacementIngredientId: "ingredient-oat",
                    quantityRequired: "180",
                  },
                ],
                recipes: [
                  { ingredientId: "ingredient-oat", quantityRequired: "150" },
                ],
              },
            ],
          },
        ],
      },
      tenant,
    );

    expect(mocks.createProduct).toHaveBeenCalledWith(
      expect.anything(),
      "org-1",
      "outlet-1",
      expect.objectContaining({
        optionGroups: [
          {
            id: undefined,
            name: "Temperature",
            selectionType: "single",
            isRequired: true,
            sortOrder: 0,
            isActive: true,
            values: [
              {
                id: undefined,
                name: "Hot",
                priceDelta: "0",
                sortOrder: 0,
                isActive: true,
                recipes: [],
                replacementRules: [],
              },
              {
                id: undefined,
                name: "Iced",
                priceDelta: "3000",
                sortOrder: 1,
                isActive: false,
                recipes: [],
                replacementRules: [],
              },
            ],
          },
          {
            id: undefined,
            name: "Extra topping",
            selectionType: "multiple",
            isRequired: false,
            sortOrder: 1,
            isActive: true,
            values: [
              {
                id: undefined,
                name: "Oat milk",
                priceDelta: "5000",
                sortOrder: 0,
                isActive: true,
                replacementRules: [
                  {
                    replacedIngredientId: "ingredient-milk",
                    replacementIngredientId: "ingredient-oat",
                    quantityRequired: "180",
                  },
                ],
                recipes: [
                  {
                    ingredientId: "ingredient-oat",
                    quantityRequired: "150",
                  },
                ],
              },
            ],
          },
        ],
      }),
    );
  });

  it("rejects inactive ingredients in option value recipes", async () => {
    mocks.ingredientFindMany.mockResolvedValue([
      { id: "ingredient-oat", isActive: false },
    ]);

    await expect(
      createProductFromPayload(
        {
          categoryId: "category-1",
          name: "Coffee",
          price: "20000",
          optionGroups: [
            {
              name: "Milk",
              values: [
                {
                  name: "Oat milk",
                  recipes: [
                    { ingredientId: "ingredient-oat", quantityRequired: "150" },
                  ],
                },
              ],
            },
          ],
        },
        tenant,
      ),
    ).rejects.toMatchObject({
      fieldErrors: {
        recipes: "Recipes can only use active ingredients.",
      },
    });
    expect(mocks.createProduct).not.toHaveBeenCalled();
  });

  it("rejects inactive ingredients in option value replacement rules", async () => {
    mocks.ingredientFindMany.mockResolvedValue([
      { id: "ingredient-milk", isActive: true },
      { id: "ingredient-oat", isActive: false },
    ]);

    await expect(
      createProductFromPayload(
        {
          categoryId: "category-1",
          name: "Coffee",
          price: "20000",
          optionGroups: [
            {
              name: "Milk",
              values: [
                {
                  name: "Oat milk",
                  replacementRules: [
                    {
                      replacedIngredientId: "ingredient-milk",
                      replacementIngredientId: "ingredient-oat",
                      quantityRequired: "180",
                    },
                  ],
                },
              ],
            },
          ],
        },
        tenant,
      ),
    ).rejects.toMatchObject({
      fieldErrors: {
        recipes: "Recipes can only use active ingredients.",
      },
    });
    expect(mocks.createProduct).not.toHaveBeenCalled();
  });

  it("rejects option groups without active values", async () => {
    await expect(
      createProductFromPayload(
        {
          categoryId: "category-1",
          name: "Coffee",
          price: "20000",
          optionGroups: [{ name: "Temperature", values: [] }],
        },
        tenant,
      ),
    ).rejects.toMatchObject({
      fieldErrors: {
        "optionGroups.0.values": "Add at least one active option value.",
      },
    });
    expect(mocks.createProduct).not.toHaveBeenCalled();
  });

  it("rejects missing required product fields and negative prices", async () => {
    await expect(
      createProductFromPayload({ categoryId: "", name: "", price: "-1" }, tenant),
    ).rejects.toMatchObject({
      fieldErrors: {
        categoryId: "Category is required.",
        name: "Product name is required.",
        price: "Price must be greater than or equal to 0.",
      },
    });
    expect(mocks.createProduct).not.toHaveBeenCalled();
  });

  it("ignores legacy variant payloads on product writes", async () => {
    await createProductFromPayload(
      {
        categoryId: "category-1",
        name: "Coffee",
        price: "20000",
        variants: [{ name: "Large", priceDelta: "5000" }],
      },
      tenant,
    );

    expect(mocks.createProduct).toHaveBeenCalledWith(
      expect.anything(),
      "org-1",
      "outlet-1",
      expect.not.objectContaining({ variants: expect.anything() }),
    );
  });

  it("rejects duplicate recipe rows for the same product", async () => {
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
        tenant,
      ),
    ).rejects.toMatchObject({
      fieldErrors: {
        "recipes.1.ingredientId":
          "This ingredient is already used for this product.",
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
        tenant,
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
        tenant,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(mocks.updateProduct).not.toHaveBeenCalled();
  });

  it("passes list filters and maps empty product states", async () => {
    mocks.listProducts.mockResolvedValue([]);

    await expect(
      getProductList(
        tenant,
        new URL("https://pos.local/api/products?search=coffee&categoryId=category-1"),
        false,
      ),
    ).resolves.toEqual([]);
    expect(mocks.listProducts).toHaveBeenCalledWith(expect.anything(), "org-1", "outlet-1", {
      search: "coffee",
      categoryId: "category-1",
      includeUnavailable: false,
    });
  });
});
