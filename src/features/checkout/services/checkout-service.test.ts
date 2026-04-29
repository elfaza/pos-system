import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/lib/api-response";
import {
  finalizeCashCheckout,
  parseCashCheckoutPayload,
  parseHoldOrderPayload,
  parseOrderStatusFilter,
} from "./checkout-service";

const mocks = vi.hoisted(() => ({
  findProductsForCheckout: vi.fn(),
  getSettings: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

vi.mock("../repositories/order-repository", () => ({
  checkoutOrderInclude: {},
  findHeldOrderById: vi.fn(),
  findOrderByIdForUser: vi.fn(),
  findProductsForCheckout: mocks.findProductsForCheckout,
  listHeldOrdersForUser: vi.fn(),
  listOrdersForUser: vi.fn(),
}));

vi.mock("@/features/catalog/repositories/settings-repository", () => ({
  getSettings: mocks.getSettings,
}));

const actor = {
  id: "cashier-1",
  name: "Cashier",
  email: "cashier@pos.local",
  role: "cashier" as const,
};

const checkoutProduct = {
  id: "product-1",
  name: "Coffee",
  price: "20000",
  trackStock: true,
  stockQuantity: "10",
  isAvailable: true,
  category: {
    name: "Drinks",
    isActive: true,
  },
  variants: [
    {
      id: "variant-large",
      name: "Large",
      priceDelta: "5000",
      isActive: true,
    },
  ],
  ingredients: [],
};

describe("checkout service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findProductsForCheckout.mockResolvedValue([checkoutProduct]);
    mocks.getSettings.mockResolvedValue({
      taxEnabled: true,
      taxRate: "10",
      serviceChargeEnabled: false,
      serviceChargeRate: "0",
    });
  });

  it("parses a valid cash checkout payload", () => {
    expect(
      parseCashCheckoutPayload({
        items: [
          {
            productId: "product-1",
            variantId: "",
            quantity: "2",
            discountAmount: "1000",
            notes: " less ice ",
          },
        ],
        cashReceivedAmount: "50000",
        notes: " paid in cash ",
      }),
    ).toEqual({
      items: [
        {
          productId: "product-1",
          variantId: null,
          quantity: 2,
          discountAmount: 1000,
          notes: "less ice",
        },
      ],
      cashReceivedAmount: 50000,
      notes: "paid in cash",
    });
  });

  it("rejects checkout with no cart items", () => {
    expect(() => parseCashCheckoutPayload({ items: [], cashReceivedAmount: 0 }))
      .toThrow(ValidationError);
  });

  it("reports item-level validation errors", () => {
    expect(() =>
      parseHoldOrderPayload({
        items: [{ productId: "", quantity: 0, discountAmount: -1 }],
      }),
    ).toThrowError(ValidationError);
  });

  it("rejects invalid order status filters", () => {
    expect(parseOrderStatusFilter("paid")).toBe("paid");
    expect(parseOrderStatusFilter(null)).toBeUndefined();
    expect(() => parseOrderStatusFilter("unknown")).toThrow(ValidationError);
  });

  it("rejects unavailable products before payment is saved", async () => {
    mocks.findProductsForCheckout.mockResolvedValue([
      {
        ...checkoutProduct,
        isAvailable: false,
      },
    ]);

    await expect(
      finalizeCashCheckout(
        {
          items: [
            {
              productId: "product-1",
              variantId: null,
              quantity: 1,
              discountAmount: 0,
              notes: "",
            },
          ],
          cashReceivedAmount: 50_000,
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects insufficient stock", async () => {
    mocks.findProductsForCheckout.mockResolvedValue([
      {
        ...checkoutProduct,
        stockQuantity: "1",
      },
    ]);

    await expect(
      finalizeCashCheckout(
        {
          items: [
            {
              productId: "product-1",
              variantId: null,
              quantity: 2,
              discountAmount: 0,
              notes: "",
            },
          ],
          cashReceivedAmount: 50_000,
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects insufficient ingredient stock before payment is saved", async () => {
    mocks.findProductsForCheckout.mockResolvedValue([
      {
        ...checkoutProduct,
        trackStock: false,
        stockQuantity: null,
        ingredients: [
          {
            id: "recipe-1",
            productId: "product-1",
            variantId: null,
            ingredientId: "ingredient-1",
            quantityRequired: "20",
            ingredient: {
              id: "ingredient-1",
              name: "Milk",
              unit: "ml",
              currentStock: "10",
              isActive: true,
            },
          },
        ],
      },
    ]);

    await expect(
      finalizeCashCheckout(
        {
          items: [
            {
              productId: "product-1",
              variantId: null,
              quantity: 1,
              discountAmount: 0,
              notes: "",
            },
          ],
          cashReceivedAmount: 50_000,
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects cash payments below the calculated total", async () => {
    await expect(
      finalizeCashCheckout(
        {
          items: [
            {
              productId: "product-1",
              variantId: "variant-large",
              quantity: 1,
              discountAmount: 0,
              notes: "",
            },
          ],
          cashReceivedAmount: 20_000,
        },
        actor,
      ),
    ).rejects.toMatchObject({
      fieldErrors: {
        cashReceivedAmount: "Cash received must cover the total.",
      },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
