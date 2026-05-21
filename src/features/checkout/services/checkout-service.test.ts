import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/lib/api-response";
import {
  finalizeCashCheckout,
  finalizeCheckout,
  mergeHeldDineInOrders,
  moveHeldDineInOrderTable,
  parseCheckoutPayload,
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
  findHeldOrderById: vi.fn(),
  createSalesAccountingForPaidCashOrder: vi.fn(),
  createSalesAccountingForPaidOrder: vi.fn(),
  transaction: vi.fn(),
  tx: {
    activityLog: { create: vi.fn() },
    diningTable: { findFirst: vi.fn() },
    ingredient: { findUnique: vi.fn(), update: vi.fn() },
    order: { aggregate: vi.fn(), create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    orderItem: { updateMany: vi.fn() },
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
  findHeldOrderById: mocks.findHeldOrderById,
  findOrderByIdForUser: vi.fn(),
  findProductsForCheckout: mocks.findProductsForCheckout,
  listHeldOrdersForUser: vi.fn(),
  listOrdersForUser: vi.fn(),
}));

vi.mock("@/features/catalog/repositories/settings-repository", () => ({
  getSettings: mocks.getSettings,
}));

vi.mock("@/features/accounting/services/accounting-service", () => ({
  createSalesAccountingForPaidCashOrder: mocks.createSalesAccountingForPaidCashOrder,
  createSalesAccountingForPaidOrder: mocks.createSalesAccountingForPaidOrder,
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
  optionGroups: [
    {
      id: "group-temp",
      name: "Temperature",
      selectionType: "single",
      isRequired: false,
      sortOrder: 0,
      isActive: true,
      values: [
        {
          id: "value-iced",
          groupId: "group-temp",
          name: "Iced",
          priceDelta: "3000",
          sortOrder: 0,
          isActive: true,
        },
      ],
    },
    {
      id: "group-topping",
      name: "Extra topping",
      selectionType: "multiple",
      isRequired: false,
      sortOrder: 1,
      isActive: true,
      values: [
        {
          id: "value-oat",
          groupId: "group-topping",
          name: "Oat milk",
          priceDelta: "5000",
          sortOrder: 0,
          isActive: true,
          recipes: [
            {
              id: "option-recipe-oat",
              optionValueId: "value-oat",
              ingredientId: "ingredient-oat",
              quantityRequired: "150",
              ingredient: {
                id: "ingredient-oat",
                name: "Oat milk",
                unit: "ml",
                currentStock: "500",
                isActive: true,
              },
            },
          ],
        },
      ],
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
      cashPaymentEnabled: true,
      qrisPaymentEnabled: true,
      inventoryEnabled: true,
      kitchenEnabled: true,
      queueEnabled: true,
      accountingEnabled: true,
      timeZone: "Asia/Jakarta",
      businessDayStartTime: "00:00",
    });
    mocks.transaction.mockImplementation((callback) => callback(mocks.tx));
    mocks.tx.ingredient.findUnique.mockImplementation(({ where }) => {
      if (where.id === "ingredient-oat") {
        return Promise.resolve({
          id: "ingredient-oat",
          name: "Oat milk",
          unit: "ml",
          currentStock: "500",
          isActive: true,
        });
      }

      return Promise.resolve(null);
    });
    mocks.tx.ingredient.update.mockResolvedValue({});
    mocks.tx.product.update.mockResolvedValue({});
    mocks.tx.stockMovement.create.mockResolvedValue({});
    mocks.tx.activityLog.create.mockResolvedValue({});
    mocks.tx.diningTable.findFirst.mockResolvedValue({
      id: "table-2",
      name: "Table 2",
      sortOrder: 2,
      isActive: true,
    });
    mocks.createSalesAccountingForPaidCashOrder.mockResolvedValue(undefined);
    mocks.createSalesAccountingForPaidOrder.mockResolvedValue(undefined);
    mocks.tx.order.aggregate.mockResolvedValue({
      _max: { queueNumber: 7 },
    });
    mocks.tx.order.create.mockResolvedValue({
      id: "order-1",
      orderNumber: "ORD-001",
      orderType: "takeaway",
      status: "paid",
      queueBusinessDate: "2026-04-29",
      queueNumber: 8,
      kitchenStatus: "received",
      kitchenPreparingAt: null,
      kitchenReadyAt: null,
      kitchenCompletedAt: null,
      subtotalAmount: "40000",
      discountAmount: "0",
      taxAmount: "4000",
      serviceChargeAmount: "0",
      totalAmount: "44000",
      heldAt: null,
      paidAt: new Date("2026-04-29T09:00:00.000Z"),
      createdAt: new Date("2026-04-29T09:00:00.000Z"),
      cashier: { name: actor.name, email: actor.email },
      items: [
        {
          id: "item-1",
          productId: "product-1",
          variantId: null,
          productNameSnapshot: "Coffee",
          variantNameSnapshot: null,
          quantity: "2",
          unitPrice: "20000",
          discountAmount: "0",
          lineTotal: "40000",
          notes: null,
          createdAt: new Date("2026-04-29T09:00:00.000Z"),
        },
      ],
      payments: [
        {
          id: "payment-1",
          method: "cash",
          status: "paid",
          amount: "44000",
          cashReceivedAmount: "60000",
          changeAmount: "16000",
          paidAt: new Date("2026-04-29T09:00:00.000Z"),
        },
      ],
    });
    mocks.tx.order.update.mockImplementation(({ data }) =>
      Promise.resolve({
        id: "held-1",
        orderNumber: "HELD-001",
        orderType: "dine_in",
        tableId: data.tableId ?? "table-1",
        table: { name: data.tableId === "table-2" ? "Table 2" : "Table 1" },
        status: data.status ?? "held",
        queueBusinessDate: null,
        queueNumber: null,
        kitchenStatus: null,
        kitchenPreparingAt: null,
        kitchenReadyAt: null,
        kitchenCompletedAt: null,
        subtotalAmount: "20000",
        discountAmount: "0",
        taxAmount: "0",
        serviceChargeAmount: "0",
        totalAmount: "20000",
        heldAt: new Date("2026-05-20T09:00:00.000Z"),
        paidAt: null,
        createdAt: new Date("2026-05-20T09:00:00.000Z"),
        items: [],
        payments: [],
      }),
    );
    mocks.tx.order.findUnique.mockResolvedValue({
      id: "target-held",
      orderNumber: "HELD-TARGET",
      orderType: "dine_in",
      tableId: "table-1",
      table: { name: "Table 1" },
      status: "held",
      queueBusinessDate: null,
      queueNumber: null,
      kitchenStatus: null,
      kitchenPreparingAt: null,
      kitchenReadyAt: null,
      kitchenCompletedAt: null,
      subtotalAmount: "50000",
      discountAmount: "5000",
      taxAmount: "4500",
      serviceChargeAmount: "0",
      totalAmount: "49500",
      heldAt: new Date("2026-05-20T09:00:00.000Z"),
      paidAt: null,
      createdAt: new Date("2026-05-20T09:00:00.000Z"),
      items: [],
      payments: [],
    });
    mocks.tx.orderItem.updateMany.mockResolvedValue({ count: 1 });
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
      orderType: "takeaway",
      tableId: null,
      deliveryCustomerName: null,
      deliveryCustomerPhone: null,
      deliveryAddress: null,
      deliveryNotes: null,
      items: [
        {
          productId: "product-1",
          variantId: null,
          selectedOptionValueIds: [],
          quantity: 2,
          discountAmount: 1000,
          notes: "less ice",
        },
      ],
      cashReceivedAmount: 50000,
      notes: "paid in cash",
    });
  });

  it("parses a valid QRIS checkout payload with order type", () => {
    expect(
      parseCheckoutPayload({
        orderType: "dine_in",
        paymentMethod: "qris",
        items: [
          {
            productId: "product-1",
            variantId: "",
            selectedOptionValueIds: ["value-iced"],
            quantity: "1",
            discountAmount: "0",
            notes: " iced ",
          },
        ],
      }),
    ).toEqual({
      orderType: "dine_in",
      tableId: null,
      deliveryCustomerName: null,
      deliveryCustomerPhone: null,
      deliveryAddress: null,
      deliveryNotes: null,
      paymentMethod: "qris",
      cashReceivedAmount: null,
      items: [
        {
          productId: "product-1",
          variantId: null,
          selectedOptionValueIds: ["value-iced"],
          quantity: 1,
          discountAmount: 0,
          notes: "iced",
        },
      ],
      notes: null,
    });
  });

  it("rejects legacy checkout payloads with variants", () => {
    expect(() =>
      parseCheckoutPayload({
        orderType: "takeaway",
        paymentMethod: "cash",
        cashReceivedAmount: "50000",
        items: [
          {
            productId: "product-1",
            variantId: "variant-large",
            quantity: "1",
          },
        ],
      }),
    ).toThrowError(ValidationError);
  });

  it("moves a held dine-in order to another active table", async () => {
    mocks.tx.order.findFirst.mockResolvedValueOnce({
      id: "held-1",
      orderNumber: "HELD-001",
      orderType: "dine_in",
      tableId: "table-1",
      status: "held",
    });

    const order = await moveHeldDineInOrderTable(
      "held-1",
      { tableId: " table-2 " },
      actor,
    );

    expect(order.tableId).toBe("table-2");
    expect(mocks.tx.diningTable.findFirst).toHaveBeenCalledWith({
      where: { id: "table-2", isActive: true },
    });
    expect(mocks.tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "held-1" },
        data: { tableId: "table-2" },
      }),
    );
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "order.table_moved",
          entityId: "held-1",
        }),
      }),
    );
  });

  it("rejects table moves for paid orders", async () => {
    mocks.tx.order.findFirst.mockResolvedValueOnce(null);

    await expect(
      moveHeldDineInOrderTable("paid-1", { tableId: "table-2" }, actor),
    ).rejects.toThrow("Held dine-in order was not found.");
    expect(mocks.tx.order.update).not.toHaveBeenCalled();
  });

  it("merges two held dine-in orders into the target order", async () => {
    mocks.tx.order.findFirst
      .mockResolvedValueOnce({
        id: "target-held",
        orderNumber: "HELD-TARGET",
        orderType: "dine_in",
        tableId: "table-1",
        status: "held",
        subtotalAmount: "30000",
        discountAmount: "5000",
        taxAmount: "2500",
        serviceChargeAmount: "0",
        totalAmount: "27500",
      })
      .mockResolvedValueOnce({
        id: "source-held",
        orderNumber: "HELD-SOURCE",
        orderType: "dine_in",
        tableId: "table-2",
        status: "held",
        subtotalAmount: "20000",
        discountAmount: "0",
        taxAmount: "2000",
        serviceChargeAmount: "0",
        totalAmount: "22000",
      });

    const order = await mergeHeldDineInOrders(
      "target-held",
      { sourceOrderId: " source-held " },
      actor,
    );

    expect(order.id).toBe("target-held");
    expect(mocks.tx.orderItem.updateMany).toHaveBeenCalledWith({
      where: { orderId: "source-held" },
      data: { orderId: "target-held" },
    });
    expect(mocks.tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "target-held" },
        data: expect.objectContaining({
          subtotalAmount: expect.any(Object),
          discountAmount: expect.any(Object),
          taxAmount: expect.any(Object),
          totalAmount: expect.any(Object),
        }),
      }),
    );
    expect(mocks.tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "source-held" },
        data: expect.objectContaining({ status: "cancelled", tableId: null }),
      }),
    );
  });

  it("rejects checkout when a required option group is not selected", async () => {
    mocks.findProductsForCheckout.mockResolvedValueOnce([
      {
        ...checkoutProduct,
        optionGroups: [
          {
            ...checkoutProduct.optionGroups[0],
            isRequired: true,
          },
        ],
      },
    ]);

    await expect(
      finalizeCheckout(
        {
          orderType: "takeaway",
          paymentMethod: "qris",
          cashReceivedAmount: null,
          items: [
            {
              productId: "product-1",
              variantId: null,
              selectedOptionValueIds: [],
              quantity: 1,
              discountAmount: 0,
              notes: "",
            },
          ],
        },
        actor,
      ),
    ).rejects.toMatchObject({
      fieldErrors: {
        "items.0.selectedOptionValueIds": "Choose an option for Temperature.",
      },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("prices and snapshots selected product options on checkout", async () => {
    mocks.getSettings.mockResolvedValueOnce({
      taxEnabled: false,
      taxRate: "0",
      serviceChargeEnabled: false,
      serviceChargeRate: "0",
      cashPaymentEnabled: true,
      qrisPaymentEnabled: true,
      inventoryEnabled: true,
      kitchenEnabled: true,
      queueEnabled: true,
      accountingEnabled: true,
      timeZone: "Asia/Jakarta",
      businessDayStartTime: "00:00",
    });
    mocks.tx.order.create.mockResolvedValueOnce({
      id: "order-options",
      orderNumber: "ORD-OPTIONS",
      orderType: "takeaway",
      status: "paid",
      queueBusinessDate: "2026-04-29",
      queueNumber: 8,
      kitchenStatus: "received",
      kitchenPreparingAt: null,
      kitchenReadyAt: null,
      kitchenCompletedAt: null,
      subtotalAmount: "28000",
      discountAmount: "0",
      taxAmount: "0",
      serviceChargeAmount: "0",
      totalAmount: "28000",
      heldAt: null,
      paidAt: new Date("2026-04-29T09:00:00.000Z"),
      createdAt: new Date("2026-04-29T09:00:00.000Z"),
      cashier: { name: actor.name, email: actor.email },
      items: [
        {
          id: "item-options",
          productId: "product-1",
          variantId: null,
          productNameSnapshot: "Coffee",
          variantNameSnapshot: null,
          quantity: "1",
          unitPrice: "28000",
          discountAmount: "0",
          lineTotal: "28000",
          notes: null,
          createdAt: new Date("2026-04-29T09:00:00.000Z"),
          optionSelections: [
            {
              id: "selection-1",
              optionGroupId: "group-temp",
              optionValueId: "value-iced",
              groupNameSnapshot: "Temperature",
              valueNameSnapshot: "Iced",
              priceDelta: "3000",
            },
            {
              id: "selection-2",
              optionGroupId: "group-topping",
              optionValueId: "value-oat",
              groupNameSnapshot: "Extra topping",
              valueNameSnapshot: "Oat milk",
              priceDelta: "5000",
            },
          ],
        },
      ],
      payments: [
        {
          id: "payment-options",
          method: "qris",
          status: "paid",
          amount: "28000",
          cashReceivedAmount: null,
          changeAmount: null,
          paidAt: new Date("2026-04-29T09:00:00.000Z"),
        },
      ],
    });

    const order = await finalizeCheckout(
      {
        orderType: "takeaway",
        paymentMethod: "qris",
        cashReceivedAmount: null,
        items: [
          {
            productId: "product-1",
            variantId: null,
            selectedOptionValueIds: ["value-iced", "value-oat"],
            quantity: 1,
            discountAmount: 0,
            notes: "",
          },
        ],
      },
      actor,
    );

    expect(order.items[0]).toMatchObject({
      unitPrice: 28_000,
      lineTotal: 28_000,
      optionSelections: [
        {
          optionGroupId: "group-temp",
          optionValueId: "value-iced",
          groupNameSnapshot: "Temperature",
          valueNameSnapshot: "Iced",
          priceDelta: 3_000,
        },
        {
          optionGroupId: "group-topping",
          optionValueId: "value-oat",
          groupNameSnapshot: "Extra topping",
          valueNameSnapshot: "Oat milk",
          priceDelta: 5_000,
        },
      ],
    });
    expect(mocks.tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotalAmount: expect.any(Object),
          items: {
            create: [
              expect.objectContaining({
                unitPrice: expect.any(Object),
                lineTotal: expect.any(Object),
                optionSelections: {
                  create: [
                    expect.objectContaining({
                      optionGroupId: "group-temp",
                      optionValueId: "value-iced",
                      groupNameSnapshot: "Temperature",
                      valueNameSnapshot: "Iced",
                    }),
                    expect.objectContaining({
                      optionGroupId: "group-topping",
                      optionValueId: "value-oat",
                      groupNameSnapshot: "Extra topping",
                      valueNameSnapshot: "Oat milk",
                    }),
                  ],
                },
              }),
            ],
          },
        }),
      }),
    );
  });

  it("validates stock for selected option value ingredients", async () => {
    mocks.findProductsForCheckout.mockResolvedValueOnce([
      {
        ...checkoutProduct,
        trackStock: false,
        stockQuantity: null,
        optionGroups: [
          checkoutProduct.optionGroups[0],
          {
            ...checkoutProduct.optionGroups[1],
            values: [
              {
                ...checkoutProduct.optionGroups[1].values[0],
                recipes: [
                  {
                    id: "option-recipe-oat",
                    optionValueId: "value-oat",
                    ingredientId: "ingredient-oat",
                    quantityRequired: "600",
                    ingredient: {
                      id: "ingredient-oat",
                      name: "Oat milk",
                      unit: "ml",
                      currentStock: "500",
                      isActive: true,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);

    await expect(
      finalizeCheckout(
        {
          orderType: "takeaway",
          paymentMethod: "qris",
          cashReceivedAmount: null,
          items: [
            {
              productId: "product-1",
              variantId: null,
              selectedOptionValueIds: ["value-oat"],
              quantity: 1,
              discountAmount: 0,
              notes: "",
            },
          ],
        },
        actor,
      ),
    ).rejects.toMatchObject({
      fieldErrors: {
        "items.0.productId":
          "Coffee requires Oat milk, but only 500 ml is available.",
      },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("deducts selected option value ingredients on paid checkout", async () => {
    mocks.getSettings.mockResolvedValueOnce({
      taxEnabled: false,
      taxRate: "0",
      serviceChargeEnabled: false,
      serviceChargeRate: "0",
      cashPaymentEnabled: true,
      qrisPaymentEnabled: true,
      inventoryEnabled: true,
      kitchenEnabled: true,
      queueEnabled: true,
      accountingEnabled: false,
      timeZone: "Asia/Jakarta",
      businessDayStartTime: "00:00",
    });
    mocks.tx.ingredient.findUnique.mockImplementation(({ where }) => {
      if (where.id === "ingredient-oat") {
        return Promise.resolve({
          id: "ingredient-oat",
          name: "Oat milk",
          unit: "ml",
          currentStock: "500",
          isActive: true,
        });
      }

      return Promise.resolve(null);
    });
    mocks.tx.order.create.mockResolvedValueOnce({
      id: "order-option-stock",
      orderNumber: "ORD-STOCK",
      orderType: "takeaway",
      status: "paid",
      queueBusinessDate: "2026-04-29",
      queueNumber: 8,
      kitchenStatus: "received",
      kitchenPreparingAt: null,
      kitchenReadyAt: null,
      kitchenCompletedAt: null,
      subtotalAmount: "25000",
      discountAmount: "0",
      taxAmount: "0",
      serviceChargeAmount: "0",
      totalAmount: "25000",
      heldAt: null,
      paidAt: new Date("2026-04-29T09:00:00.000Z"),
      createdAt: new Date("2026-04-29T09:00:00.000Z"),
      cashier: { name: actor.name, email: actor.email },
      items: [
        {
          id: "item-option-stock",
          productId: "product-1",
          variantId: null,
          productNameSnapshot: "Coffee",
          variantNameSnapshot: null,
          quantity: "1",
          unitPrice: "25000",
          discountAmount: "0",
          lineTotal: "25000",
          notes: null,
          createdAt: new Date("2026-04-29T09:00:00.000Z"),
          optionSelections: [],
        },
      ],
      payments: [
        {
          id: "payment-option-stock",
          method: "qris",
          status: "paid",
          amount: "25000",
          cashReceivedAmount: null,
          changeAmount: null,
          paidAt: new Date("2026-04-29T09:00:00.000Z"),
        },
      ],
    });

    await finalizeCheckout(
      {
        orderType: "takeaway",
        paymentMethod: "qris",
        cashReceivedAmount: null,
        items: [
          {
            productId: "product-1",
            variantId: null,
            selectedOptionValueIds: ["value-oat"],
            quantity: 1,
            discountAmount: 0,
            notes: "",
          },
        ],
      },
      actor,
    );

    expect(mocks.tx.ingredient.update).toHaveBeenCalledWith({
      where: { id: "ingredient-oat" },
      data: {
        currentStock: {
          decrement: expect.any(Object),
        },
      },
    });
    expect(mocks.tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ingredientId: "ingredient-oat",
        productId: "product-1",
        orderId: "order-option-stock",
        type: "sale_deduction",
        quantityChange: expect.any(Object),
        reason: "QRIS order payment confirmed",
        createdByUserId: actor.id,
      }),
    });
  });

  it("replaces base ingredient stock requirements with selected option rules", async () => {
    mocks.findProductsForCheckout.mockResolvedValueOnce([
      {
        ...checkoutProduct,
        trackStock: false,
        stockQuantity: null,
        ingredients: [
          {
            id: "recipe-milk",
            productId: "product-1",
            variantId: null,
            ingredientId: "ingredient-milk",
            quantityRequired: "180",
            ingredient: {
              id: "ingredient-milk",
              name: "Fresh milk",
              unit: "ml",
              currentStock: "100",
              isActive: true,
            },
          },
        ],
        optionGroups: [
          checkoutProduct.optionGroups[0],
          {
            ...checkoutProduct.optionGroups[1],
            values: [
              {
                ...checkoutProduct.optionGroups[1].values[0],
                recipes: [],
                replacementRules: [
                  {
                    id: "replacement-oat",
                    optionValueId: "value-oat",
                    replacedIngredientId: "ingredient-milk",
                    replacementIngredientId: "ingredient-oat",
                    quantityRequired: "180",
                    replacedIngredient: {
                      id: "ingredient-milk",
                      name: "Fresh milk",
                      unit: "ml",
                      currentStock: "100",
                      isActive: true,
                    },
                    replacementIngredient: {
                      id: "ingredient-oat",
                      name: "Oat milk",
                      unit: "ml",
                      currentStock: "500",
                      isActive: true,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);

    await finalizeCheckout(
      {
        orderType: "takeaway",
        paymentMethod: "qris",
        cashReceivedAmount: null,
        items: [
          {
            productId: "product-1",
            variantId: null,
            selectedOptionValueIds: ["value-oat"],
            quantity: 1,
            discountAmount: 0,
            notes: "",
          },
        ],
      },
      actor,
    );

    expect(mocks.tx.ingredient.update).toHaveBeenCalledWith({
      where: { id: "ingredient-oat" },
      data: {
        currentStock: {
          decrement: expect.any(Object),
        },
      },
    });
    expect(mocks.tx.ingredient.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ingredient-milk" } }),
    );
  });

  it("rejects checkout when replacement option ingredient is out of stock", async () => {
    mocks.findProductsForCheckout.mockResolvedValueOnce([
      {
        ...checkoutProduct,
        trackStock: false,
        stockQuantity: null,
        ingredients: [
          {
            id: "recipe-milk",
            productId: "product-1",
            variantId: null,
            ingredientId: "ingredient-milk",
            quantityRequired: "180",
            ingredient: {
              id: "ingredient-milk",
              name: "Fresh milk",
              unit: "ml",
              currentStock: "500",
              isActive: true,
            },
          },
        ],
        optionGroups: [
          checkoutProduct.optionGroups[0],
          {
            ...checkoutProduct.optionGroups[1],
            values: [
              {
                ...checkoutProduct.optionGroups[1].values[0],
                recipes: [],
                replacementRules: [
                  {
                    id: "replacement-oat",
                    optionValueId: "value-oat",
                    replacedIngredientId: "ingredient-milk",
                    replacementIngredientId: "ingredient-oat",
                    quantityRequired: "180",
                    replacedIngredient: {
                      id: "ingredient-milk",
                      name: "Fresh milk",
                      unit: "ml",
                      currentStock: "500",
                      isActive: true,
                    },
                    replacementIngredient: {
                      id: "ingredient-oat",
                      name: "Oat milk",
                      unit: "ml",
                      currentStock: "100",
                      isActive: true,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);

    await expect(
      finalizeCheckout(
        {
          orderType: "takeaway",
          paymentMethod: "qris",
          cashReceivedAmount: null,
          items: [
            {
              productId: "product-1",
              variantId: null,
              selectedOptionValueIds: ["value-oat"],
              quantity: 1,
              discountAmount: 0,
              notes: "",
            },
          ],
        },
        actor,
      ),
    ).rejects.toMatchObject({
      fieldErrors: {
        "items.0.productId":
          "Coffee requires Oat milk, but only 100 ml is available.",
      },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects checkout when order type is missing", () => {
    expect(() =>
      parseCheckoutPayload({
        paymentMethod: "cash",
        cashReceivedAmount: "50000",
        items: [{ productId: "product-1", quantity: 1 }],
      }),
    ).toThrow(ValidationError);
  });

  it("parses table and delivery metadata for checkout and held orders", () => {
    expect(
      parseCheckoutPayload({
        orderType: "delivery",
        paymentMethod: "qris",
        tableId: " table-1 ",
        deliveryCustomerName: " Budi ",
        deliveryCustomerPhone: " 0812 ",
        deliveryAddress: " Jl. Kopi 1 ",
        deliveryNotes: " Gate A ",
        items: [{ productId: "product-1", quantity: 1 }],
      }),
    ).toMatchObject({
      tableId: "table-1",
      deliveryCustomerName: "Budi",
      deliveryCustomerPhone: "0812",
      deliveryAddress: "Jl. Kopi 1",
      deliveryNotes: "Gate A",
    });

    expect(
      parseHoldOrderPayload({
        orderType: "dine_in",
        tableId: "table-2",
        items: [{ productId: "product-1", quantity: 1 }],
      }),
    ).toMatchObject({
      tableId: "table-2",
      deliveryCustomerName: null,
      deliveryCustomerPhone: null,
      deliveryAddress: null,
      deliveryNotes: null,
    });
  });

  it("rejects checkout with no cart items", () => {
    expect(() => parseCashCheckoutPayload({ items: [], cashReceivedAmount: 0 }))
      .toThrow(ValidationError);
  });

  it("reports item-level validation errors", () => {
    expect(() =>
      parseHoldOrderPayload({
        orderType: "takeaway",
        items: [{ productId: "", quantity: 0, discountAmount: -1 }],
      }),
    ).toThrowError(ValidationError);
  });

  it("rejects held orders when order type is missing", () => {
    expect(() =>
      parseHoldOrderPayload({
        items: [{ productId: "product-1", quantity: 1 }],
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
              variantId: null,
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

  it("rejects cash checkout when cash payment is disabled", async () => {
    mocks.getSettings.mockResolvedValueOnce({
      taxEnabled: false,
      taxRate: "0",
      serviceChargeEnabled: false,
      serviceChargeRate: "0",
      cashPaymentEnabled: false,
      inventoryEnabled: true,
      kitchenEnabled: true,
      queueEnabled: true,
      accountingEnabled: true,
      timeZone: "Asia/Jakarta",
      businessDayStartTime: "00:00",
    });

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
    ).rejects.toMatchObject({
      fieldErrors: {
        cashReceivedAmount: "Cash payment is disabled.",
      },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects QRIS checkout when QRIS payment is disabled", async () => {
    mocks.getSettings.mockResolvedValueOnce({
      taxEnabled: false,
      taxRate: "0",
      serviceChargeEnabled: false,
      serviceChargeRate: "0",
      cashPaymentEnabled: true,
      qrisPaymentEnabled: false,
      inventoryEnabled: true,
      kitchenEnabled: true,
      queueEnabled: true,
      accountingEnabled: true,
      timeZone: "Asia/Jakarta",
      businessDayStartTime: "00:00",
    });

    await expect(
      finalizeCheckout(
        {
          orderType: "takeaway",
          paymentMethod: "qris",
          cashReceivedAmount: null,
          items: [
            {
              productId: "product-1",
              variantId: null,
              quantity: 1,
              discountAmount: 0,
              notes: "",
            },
          ],
        },
        actor,
      ),
    ).rejects.toMatchObject({
      fieldErrors: {
        paymentMethod: "QRIS payment is disabled.",
      },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("creates a paid QRIS payment without cash received or change", async () => {
    mocks.getSettings.mockResolvedValueOnce({
      taxEnabled: false,
      taxRate: "0",
      serviceChargeEnabled: false,
      serviceChargeRate: "0",
      cashPaymentEnabled: true,
      qrisPaymentEnabled: true,
      inventoryEnabled: true,
      kitchenEnabled: true,
      queueEnabled: true,
      accountingEnabled: true,
      timeZone: "Asia/Jakarta",
      businessDayStartTime: "00:00",
    });
    mocks.tx.order.create.mockResolvedValueOnce({
      id: "order-qris",
      orderNumber: "ORD-QRIS",
      orderType: "dine_in",
      status: "paid",
      queueBusinessDate: "2026-04-29",
      queueNumber: 8,
      kitchenStatus: "received",
      kitchenPreparingAt: null,
      kitchenReadyAt: null,
      kitchenCompletedAt: null,
      subtotalAmount: "20000",
      discountAmount: "0",
      taxAmount: "0",
      serviceChargeAmount: "0",
      totalAmount: "20000",
      heldAt: null,
      paidAt: new Date("2026-04-29T09:00:00.000Z"),
      createdAt: new Date("2026-04-29T09:00:00.000Z"),
      cashier: { name: actor.name, email: actor.email },
      items: [
        {
          id: "item-qris",
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
          id: "payment-qris",
          method: "qris",
          status: "paid",
          amount: "20000",
          cashReceivedAmount: null,
          changeAmount: null,
          paidAt: new Date("2026-04-29T09:00:00.000Z"),
        },
      ],
    });

    const order = await finalizeCheckout(
      {
        orderType: "dine_in",
        paymentMethod: "qris",
        cashReceivedAmount: null,
        items: [
          {
            productId: "product-1",
            variantId: null,
            quantity: 1,
            discountAmount: 0,
            notes: "",
          },
        ],
      },
      actor,
    );

    expect(order.orderType).toBe("dine_in");
    expect(order.payment).toMatchObject({
      method: "qris",
      status: "paid",
      amount: 20_000,
      cashReceivedAmount: null,
      changeAmount: null,
    });
    expect(mocks.tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderType: "dine_in",
          payments: {
            create: expect.objectContaining({
              method: "qris",
              cashReceivedAmount: null,
              changeAmount: null,
            }),
          },
        }),
      }),
    );
    expect(mocks.createSalesAccountingForPaidOrder).toHaveBeenCalledWith(
      mocks.tx,
      expect.objectContaining({
        paymentMethod: "qris",
        totalAmount: 20_000,
      }),
    );
  });

  it("completes cash payment with exact cash received", async () => {
    mocks.tx.order.create.mockResolvedValueOnce({
      id: "order-exact",
      orderNumber: "ORD-EXACT",
      orderType: "takeaway",
      status: "paid",
      queueBusinessDate: "2026-04-29",
      queueNumber: 8,
      kitchenStatus: "received",
      kitchenPreparingAt: null,
      kitchenReadyAt: null,
      kitchenCompletedAt: null,
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
    expect(order.queueNumber).toBe(8);
    expect(order.kitchenStatus).toBe("received");
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
            variantId: null,
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
      amount: 44_000,
      cashReceivedAmount: 60_000,
      changeAmount: 16_000,
    });
    expect(mocks.tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "paid",
          queueNumber: 8,
          kitchenStatus: "received",
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
        action: "queue.assigned",
        entityType: "order",
        entityId: "order-1",
        metadata: expect.objectContaining({
          queueNumber: 8,
        }),
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
          amount: 44_000,
        }),
      }),
    });
    expect(mocks.createSalesAccountingForPaidOrder).toHaveBeenCalledWith(
      mocks.tx,
      expect.objectContaining({
        orderId: "order-1",
        orderNumber: "ORD-001",
        paymentId: "payment-1",
        paymentMethod: "cash",
        totalAmount: 44_000,
      }),
    );
  });

  it("skips inventory validation and stock movements when inventory is disabled", async () => {
    mocks.getSettings.mockResolvedValueOnce({
      taxEnabled: false,
      taxRate: "0",
      serviceChargeEnabled: false,
      serviceChargeRate: "0",
      cashPaymentEnabled: true,
      inventoryEnabled: false,
      kitchenEnabled: true,
      queueEnabled: true,
      accountingEnabled: true,
      timeZone: "Asia/Jakarta",
      businessDayStartTime: "00:00",
    });
    mocks.findProductsForCheckout.mockResolvedValueOnce([
      {
        ...checkoutProduct,
        stockQuantity: "0",
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
              currentStock: "0",
              isActive: true,
            },
          },
        ],
      },
    ]);

    await finalizeCashCheckout(
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
        cashReceivedAmount: 60_000,
      },
      actor,
    );

    expect(mocks.tx.ingredient.findUnique).not.toHaveBeenCalled();
    expect(mocks.tx.product.update).not.toHaveBeenCalled();
    expect(mocks.tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it("skips accounting side effects when accounting is disabled", async () => {
    mocks.getSettings.mockResolvedValueOnce({
      taxEnabled: false,
      taxRate: "0",
      serviceChargeEnabled: false,
      serviceChargeRate: "0",
      cashPaymentEnabled: true,
      inventoryEnabled: true,
      kitchenEnabled: true,
      queueEnabled: true,
      accountingEnabled: false,
      timeZone: "Asia/Jakarta",
      businessDayStartTime: "00:00",
    });

    await finalizeCashCheckout(
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
        cashReceivedAmount: 60_000,
      },
      actor,
    );

    expect(mocks.createSalesAccountingForPaidOrder).not.toHaveBeenCalled();
  });

  it("omits queue and kitchen fields when both modules are disabled", async () => {
    mocks.getSettings.mockResolvedValueOnce({
      taxEnabled: false,
      taxRate: "0",
      serviceChargeEnabled: false,
      serviceChargeRate: "0",
      cashPaymentEnabled: true,
      inventoryEnabled: true,
      kitchenEnabled: false,
      queueEnabled: false,
      accountingEnabled: false,
      timeZone: "Asia/Jakarta",
      businessDayStartTime: "00:00",
    });

    await finalizeCashCheckout(
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
        cashReceivedAmount: 60_000,
      },
      actor,
    );

    expect(mocks.tx.order.aggregate).not.toHaveBeenCalled();
    expect(mocks.tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          queueBusinessDate: null,
          queueNumber: null,
          kitchenStatus: null,
        }),
      }),
    );
    expect(mocks.tx.activityLog.create).not.toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "queue.assigned" }),
    });
  });

  it("keeps queue numbers for kitchen ticketing when queue display is disabled", async () => {
    mocks.getSettings.mockResolvedValueOnce({
      taxEnabled: false,
      taxRate: "0",
      serviceChargeEnabled: false,
      serviceChargeRate: "0",
      cashPaymentEnabled: true,
      inventoryEnabled: true,
      kitchenEnabled: true,
      queueEnabled: false,
      accountingEnabled: false,
      timeZone: "Asia/Jakarta",
      businessDayStartTime: "00:00",
    });

    await finalizeCashCheckout(
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
        cashReceivedAmount: 60_000,
      },
      actor,
    );

    expect(mocks.tx.order.aggregate).toHaveBeenCalled();
    expect(mocks.tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          queueNumber: 8,
          kitchenStatus: "received",
        }),
      }),
    );
  });
});
