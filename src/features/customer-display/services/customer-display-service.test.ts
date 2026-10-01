import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCustomerDisplay,
  getCustomerDisplayMenu,
  updateCustomerDisplayFromPayload,
} from "./customer-display-service";

const mocks = vi.hoisted(() => ({
  findCustomerDisplayState: vi.fn(),
  getAvailableProductList: vi.fn(),
  getCategoryList: vi.fn(),
  getSettings: vi.fn(),
  upsertCustomerDisplayState: vi.fn(),
}));

const tenant = {
  userId: "user-1",
  organizationId: "org-1",
  outletId: "outlet-1",
  role: "owner" as const,
};

vi.mock("../repositories/customer-display-repository", () => ({
  findCustomerDisplayState: mocks.findCustomerDisplayState,
  upsertCustomerDisplayState: mocks.upsertCustomerDisplayState,
}));

vi.mock("@/features/catalog/repositories/settings-repository", () => ({
  getSettings: mocks.getSettings,
}));

vi.mock("@/features/catalog/services/category-service", () => ({
  getCategoryList: mocks.getCategoryList,
}));

vi.mock("@/features/catalog/services/product-service", () => ({
  getAvailableProductList: mocks.getAvailableProductList,
}));

describe("customer display service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSettings.mockResolvedValue({ storeName: "Maza Cafe" });
  });

  it("returns idle display when no state exists", async () => {
    mocks.findCustomerDisplayState.mockResolvedValue(null);

    await expect(getCustomerDisplay(tenant)).resolves.toEqual({
      status: "idle",
      storeName: "Maza Cafe",
      orderType: null,
      items: [],
      totals: {
        subtotalAmount: 0,
        discountAmount: 0,
        serviceChargeAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
      },
      paidOrderNumber: null,
      updatedAt: expect.any(String),
    });
  });

  it("stores active cart payloads", async () => {
    mocks.upsertCustomerDisplayState.mockResolvedValue({
      status: "active",
      storeName: "Maza Cafe",
      payload: {
        orderType: "takeaway",
        items: [
          {
            id: "line-1",
            productName: "Latte",
            quantity: 1,
            unitPrice: 25000,
            discountAmount: 0,
            lineTotal: 25000,
            selectedOptions: [],
          },
        ],
        totals: {
          subtotalAmount: 25000,
          discountAmount: 0,
          serviceChargeAmount: 0,
          taxAmount: 0,
          totalAmount: 25000,
        },
      },
      paidOrderNumber: null,
      paidAt: null,
      updatedAt: new Date("2026-06-03T08:00:00.000Z"),
    });

    const display = await updateCustomerDisplayFromPayload({
      status: "active",
      storeName: "Maza Cafe",
      orderType: "takeaway",
      items: [
        {
          id: "line-1",
          productName: "Latte",
          quantity: 1,
          unitPrice: 25000,
          discountAmount: 0,
          lineTotal: 25000,
          selectedOptions: [],
        },
      ],
      totals: {
        subtotalAmount: 25000,
        discountAmount: 0,
        serviceChargeAmount: 0,
        taxAmount: 0,
        totalAmount: 25000,
      },
    }, tenant);

    expect(display.status).toBe("active");
    expect(display.items[0]?.productName).toBe("Latte");
    expect(mocks.upsertCustomerDisplayState).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active", storeName: "Maza Cafe" }),
    );
  });

  it("returns only sellable customer-facing menu fields grouped by active category", async () => {
    mocks.getCategoryList.mockResolvedValue([
      { id: "cat-drinks", name: "Drinks", sortOrder: 1 },
      { id: "cat-food", name: "Food", sortOrder: 2 },
      { id: "cat-empty", name: "Empty", sortOrder: 3 },
    ]);
    mocks.getAvailableProductList.mockResolvedValue([
      {
        id: "product-coffee",
        categoryId: "cat-drinks",
        name: "Coffee",
        imageUrl: "/coffee.jpg",
        price: 22000,
        costPrice: 9000,
        stockQuantity: 12,
        recipes: [{ id: "secret-recipe" }],
        canSellOne: true,
      },
      {
        id: "product-sold-out",
        categoryId: "cat-drinks",
        name: "Sold out tea",
        imageUrl: null,
        price: 15000,
        canSellOne: false,
      },
      {
        id: "product-rice",
        categoryId: "cat-food",
        name: "Nasi Ayam",
        imageUrl: null,
        price: 25000,
        canSellOne: true,
      },
    ]);

    await expect(getCustomerDisplayMenu(tenant)).resolves.toEqual({
      categories: [
        {
          id: "cat-drinks",
          name: "Drinks",
          products: [
            {
              id: "product-coffee",
              name: "Coffee",
              imageUrl: "/coffee.jpg",
              price: 22000,
            },
          ],
        },
        {
          id: "cat-food",
          name: "Food",
          products: [
            {
              id: "product-rice",
              name: "Nasi Ayam",
              imageUrl: null,
              price: 25000,
            },
          ],
        },
      ],
    });
  });
});
