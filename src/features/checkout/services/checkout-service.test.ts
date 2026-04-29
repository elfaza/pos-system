import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/lib/api-response";
import {
  finalizeCashCheckout,
  parseCashCheckoutPayload,
  parseHoldOrderPayload,
  parseOrderStatusFilter,
  parsePaymentDateFilter,
  parsePaymentMethodFilter,
  parsePaymentStatusFilter,
} from "./checkout-service";

const mocks = vi.hoisted(() => ({
  findProductsForCheckout: vi.fn(),
  getSettings: vi.fn(),
  transaction: vi.fn(),
  tx: {
    activityLog: { create: vi.fn() },
    ingredient: { findUnique: vi.fn(), update: vi.fn() },
    order: { create: vi.fn(), update: vi.fn() },
    product: { update: vi.fn() },
    stockMovement: { create: vi.fn() },
  },
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
    mocks.transaction.mockImplementation((callback) => callback(mocks.tx));
    mocks.tx.ingredient.findUnique.mockResolvedValue(null);
    mocks.tx.ingredient.update.mockResolvedValue({});
    mocks.tx.product.update.mockResolvedValue({});
    mocks.tx.stockMovement.create.mockResolvedValue({});
    mocks.tx.activityLog.create.mockResolvedValue({});
    mocks.tx.order.create.mockResolvedValue({
      id: "order-1",
      orderNumber: "ORD-001",
      status: "paid",
      subtotalAmount: "50000",
      discountAmount: "0",
      taxAmount: "5000",
      serviceChargeAmount: "0",
      totalAmount: "55000",
      heldAt: null,
      paidAt: new Date("2026-04-29T09:00:00.000Z"),
      createdAt: new Date("2026-04-29T09:00:00.000Z"),
      cashier: { name: actor.name, email: actor.email },
      items: [
        {
          id: "item-1",
          productId: "product-1",
          variantId: "variant-large",
          productNameSnapshot: "Coffee",
          variantNameSnapshot: "Large",
          quantity: "2",
          unitPrice: "25000",
          discountAmount: "0",
          lineTotal: "50000",
          notes: null,
          createdAt: new Date("2026-04-29T09:00:00.000Z"),
        },
      ],
      payments: [
        {
          id: "payment-1",
          method: "cash",
          status: "paid",
          amount: "55000",
          cashReceivedAmount: "60000",
          changeAmount: "5000",
          paidAt: new Date("2026-04-29T09:00:00.000Z"),
        },
      ],
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

  it("parses payment history filters", () => {
    expect(parsePaymentMethodFilter("cash")).toBe("cash");
    expect(parsePaymentStatusFilter("paid")).toBe("paid");
    expect(parsePaymentDateFilter("2026-04-29", "paidFrom")).toBeInstanceOf(Date);
    expect(parsePaymentMethodFilter(null)).toBeUndefined();
    expect(parsePaymentStatusFilter(null)).toBeUndefined();
    expect(parsePaymentDateFilter(null, "paidFrom")).toBeUndefined();
    expect(() => parsePaymentMethodFilter("card")).toThrow(ValidationError);
    expect(() => parsePaymentStatusFilter("complete")).toThrow(ValidationError);
    expect(() => parsePaymentDateFilter("not-a-date", "paidFrom")).toThrow(
      ValidationError,
    );
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

  it("completes cash payment with exact cash received", async () => {
    mocks.tx.order.create.mockResolvedValueOnce({
      id: "order-exact",
      orderNumber: "ORD-EXACT",
      status: "paid",
      subtotalAmount: "20000",
      discountAmount: "0",
      taxAmount: "2000",
      serviceChargeAmount: "0",
      totalAmount: "22000",
      heldAt: null,
      paidAt: new Date("2026-04-29T09:00:00.000Z"),
      createdAt: new Date("2026-04-29T09:00:00.000Z"),
      cashier: { name: actor.name, email: actor.email },
      items: [
        {
          id: "item-exact",
          productId: "product-1",
          variantId: null,
          productNameSnapshot: "Coffee",
          variantNameSnapshot: null,
          quantity: "1",
          unitPrice: "20000",
          discountAmount: "0",
          lineTotal: "20000",
          notes: null,
          createdAt: new Date("2026-04-29T09:00:00.000Z"),
        },
      ],
      payments: [
        {
          id: "payment-exact",
          method: "cash",
          status: "paid",
          amount: "22000",
          cashReceivedAmount: "22000",
          changeAmount: "0",
          paidAt: new Date("2026-04-29T09:00:00.000Z"),
        },
      ],
    });

    const order = await finalizeCashCheckout(
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
        cashReceivedAmount: 22_000,
      },
      actor,
    );

    expect(order.status).toBe("paid");
    expect(order.payment).toMatchObject({
      method: "cash",
      status: "paid",
      amount: 22_000,
      cashReceivedAmount: 22_000,
      changeAmount: 0,
    });
  });

  it("creates a paid cash payment, deducts product stock, and logs payment transition", async () => {
    const order = await finalizeCashCheckout(
      {
        items: [
          {
            productId: "product-1",
            variantId: "variant-large",
            quantity: 2,
            discountAmount: 0,
            notes: "",
          },
        ],
        cashReceivedAmount: 60_000,
      },
      actor,
    );

    expect(order.status).toBe("paid");
    expect(order.payment).toMatchObject({
      method: "cash",
      status: "paid",
      amount: 55_000,
      cashReceivedAmount: 60_000,
      changeAmount: 5_000,
    });
    expect(mocks.tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "paid",
          totalAmount: expect.any(Object),
          payments: {
            create: expect.objectContaining({
              method: "cash",
              status: "paid",
              amount: expect.any(Object),
              cashReceivedAmount: expect.any(Object),
              changeAmount: expect.any(Object),
              paidAt: expect.any(Date),
            }),
          },
        }),
        include: expect.any(Object),
      }),
    );
    expect(mocks.tx.product.update).toHaveBeenCalledWith({
      where: { id: "product-1" },
      data: { stockQuantity: { decrement: expect.any(Object) } },
    });
    expect(mocks.tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: "product-1",
        orderId: "order-1",
        type: "sale_deduction",
        quantityChange: expect.any(Object),
        reason: "Cash order payment confirmed",
        createdByUserId: actor.id,
      }),
    });
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "payment.paid",
        entityType: "payment",
        entityId: "payment-1",
        metadata: expect.objectContaining({
          previousStatus: "pending",
          status: "paid",
          method: "cash",
          amount: 55_000,
        }),
      }),
    });
  });
});
