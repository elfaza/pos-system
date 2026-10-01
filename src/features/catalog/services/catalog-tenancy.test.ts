import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, ValidationError } from "@/lib/api-response";
import { createCategoryFromPayload, getCategoryList, updateCategoryFromPayload } from "./category-service";
import { createProductFromPayload, getProductList, updateProductFromPayload } from "./product-service";
import { getSettings } from "../repositories/settings-repository";

const mocks = vi.hoisted(() => ({
  activityLogCreate: vi.fn(),
  categoryCreate: vi.fn(),
  categoryFindFirst: vi.fn(),
  categoryFindMany: vi.fn(),
  categoryUpdateMany: vi.fn(),
  ingredientFindMany: vi.fn(),
  appSettingCreate: vi.fn(),
  appSettingFindFirst: vi.fn(),
  productCreate: vi.fn(),
  productFindFirst: vi.fn(),
  productFindMany: vi.fn(),
  productVariantFindMany: vi.fn(),
}));

vi.mock("@/lib/tenant-prisma", () => ({
  withTenantTransaction: (_context: unknown, callback: (tx: unknown) => unknown) =>
    callback({
      $queryRaw: vi.fn().mockResolvedValue([]),
      activityLog: { create: mocks.activityLogCreate },
      appSetting: { create: mocks.appSettingCreate, findFirst: mocks.appSettingFindFirst },
      category: {
        create: mocks.categoryCreate,
        findFirst: mocks.categoryFindFirst,
        findMany: mocks.categoryFindMany,
        updateMany: mocks.categoryUpdateMany,
      },
      ingredient: { findMany: mocks.ingredientFindMany },
      product: {
        create: mocks.productCreate,
        findFirst: mocks.productFindFirst,
        findMany: mocks.productFindMany,
      },
      productVariant: { findMany: mocks.productVariantFindMany },
    }),
}));

const orgOne = { userId: "user-1", organizationId: "org-1", outletId: "outlet-1", role: "owner" as const };
const orgTwo = { userId: "user-2", organizationId: "org-2", outletId: "outlet-2", role: "owner" as const };

describe("catalog tenancy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activityLogCreate.mockResolvedValue({});
    mocks.categoryCreate.mockImplementation(({ data }) => Promise.resolve({ id: `category-${data.organizationId}`, ...data }));
    mocks.categoryFindFirst.mockResolvedValue({ id: "category-1" });
    mocks.categoryFindMany.mockResolvedValue([]);
    mocks.categoryUpdateMany.mockResolvedValue({ count: 0 });
    mocks.ingredientFindMany.mockResolvedValue([]);
    mocks.appSettingFindFirst.mockResolvedValue(null);
    mocks.appSettingCreate.mockImplementation(({ data }) => Promise.resolve({ id: `settings-${data.organizationId}`, ...data }));
    mocks.productCreate.mockResolvedValue({
      id: "product-1", categoryId: "category-1", category: { name: "Drinks" },
      name: "Coffee", sku: "COF", description: null, imageUrl: null, price: "20000",
      costPrice: null, trackStock: false, stockQuantity: null, lowStockThreshold: null,
      isAvailable: true, optionGroups: [], ingredients: [],
    });
    mocks.productFindFirst.mockResolvedValue(null);
    mocks.productFindMany.mockResolvedValue([]);
    mocks.productVariantFindMany.mockResolvedValue([]);
  });

  it("scopes category lists and guessed-ID updates to the active organization", async () => {
    await getCategoryList(orgTwo, false);
    expect(mocks.categoryFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: "org-2", isActive: true },
    }));

    mocks.categoryFindFirst.mockResolvedValue(null);
    await expect(updateCategoryFromPayload("category-from-org-1", { name: "Changed" }, orgTwo))
      .rejects.toBeInstanceOf(NotFoundError);
    expect(mocks.categoryFindFirst).toHaveBeenCalledWith({
      where: { id: "category-from-org-1", organizationId: "org-2" },
    });
    expect(mocks.categoryUpdateMany).not.toHaveBeenCalled();
  });

  it("writes same-slug categories with an explicit organization scope", async () => {
    await createCategoryFromPayload({ name: "Drinks", slug: "shared" }, orgOne);
    await createCategoryFromPayload({ name: "Drinks", slug: "shared" }, orgTwo);

    expect(mocks.categoryCreate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({ organizationId: "org-1", slug: "shared" }),
    }));
    expect(mocks.categoryCreate).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({ organizationId: "org-2", slug: "shared" }),
    }));
  });

  it("scopes product creation and rejects a category from another organization", async () => {
    await createProductFromPayload({ categoryId: "category-1", name: "Coffee", sku: "SHARED", price: "100" }, orgTwo);
    expect(mocks.categoryFindFirst).toHaveBeenCalledWith({
      where: { id: "category-1", organizationId: "org-2" },
      select: { id: true },
    });
    expect(mocks.productCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        organizationId: "org-2",
        sku: "SHARED",
        outletProducts: { create: expect.objectContaining({ outletId: "outlet-2", isAvailable: true }) },
      }),
    }));

    mocks.categoryFindFirst.mockResolvedValue(null);
    await expect(createProductFromPayload(
      { categoryId: "category-from-org-1", name: "Coffee", price: "100" }, orgTwo,
    )).rejects.toBeInstanceOf(ValidationError);
  });

  it("filters sellable products by the active outlet", async () => {
    await getProductList(orgTwo, new URL("https://pos.local/api/products"), false);
    expect(mocks.productFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: "org-2",
        outletProducts: { some: { outletId: "outlet-2", isAvailable: true } },
      }),
    }));
  });

  it("does not reveal a product from another organization by guessed ID", async () => {
    await expect(updateProductFromPayload("foreign-product", {
      categoryId: "category-1", name: "Coffee", price: "100",
    }, orgTwo)).rejects.toBeInstanceOf(NotFoundError);
    expect(mocks.productFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "foreign-product", organizationId: "org-2" },
    }));
  });

  it("creates and reads settings within the selected outlet", async () => {
    await getSettings(orgTwo);
    expect(mocks.appSettingFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: "org-2", outletId: "outlet-2" },
    }));
    expect(mocks.appSettingCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizationId: "org-2", outletId: "outlet-2" }),
    }));
  });
});
