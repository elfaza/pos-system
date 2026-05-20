import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/lib/api-response";
import {
  changeKitchenStatus,
  getKitchenBoard,
  getKitchenTicket,
  parseKitchenStatus,
} from "./kitchen-service";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  tx: {
    activityLog: { create: vi.fn() },
    order: { findFirst: vi.fn(), update: vi.fn() },
  },
  listActiveKitchenOrders: vi.fn(),
  requireModuleEnabled: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

vi.mock("../repositories/kitchen-repository", () => ({
  findKitchenOrderById: (id: string, tx: typeof mocks.tx = mocks.tx) =>
    tx.order.findFirst({ where: { id } }),
  kitchenStatuses: ["received", "preparing", "ready", "completed"],
  listActiveKitchenOrders: mocks.listActiveKitchenOrders,
  listReadyQueueOrders: vi.fn(),
  updateKitchenOrderStatus: (
    id: string,
    data: Record<string, unknown>,
    tx: typeof mocks.tx,
  ) => tx.order.update({ where: { id }, data, include: {} }),
}));

vi.mock("@/features/catalog/services/module-config", () => ({
  requireModuleEnabled: mocks.requireModuleEnabled,
}));

const actor = {
  id: "cashier-1",
  name: "Cashier",
  email: "cashier@pos.local",
  role: "cashier" as const,
};

function buildOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    orderNumber: "ORD-001",
    status: "paid",
    queueBusinessDate: "2026-04-29",
    queueNumber: 5,
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
    tableId: null,
    table: null,
    orderType: "takeaway",
    deliveryCustomerName: null,
    deliveryCustomerPhone: null,
    deliveryAddress: null,
    deliveryNotes: null,
    items: [],
    payments: [],
    ...overrides,
  };
}

describe("kitchen service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireModuleEnabled.mockResolvedValue({});
    mocks.transaction.mockImplementation((callback) => callback(mocks.tx));
    mocks.tx.activityLog.create.mockResolvedValue({});
    mocks.tx.order.findFirst.mockResolvedValue(buildOrder());
    mocks.tx.order.update.mockResolvedValue(
      buildOrder({
        kitchenStatus: "preparing",
        kitchenPreparingAt: new Date("2026-04-29T09:05:00.000Z"),
      }),
    );
  });

  it("parses valid kitchen statuses", () => {
    expect(parseKitchenStatus("ready")).toBe("ready");
    expect(() => parseKitchenStatus("waiting")).toThrow(ValidationError);
  });

  it("groups active kitchen orders by status", async () => {
    mocks.listActiveKitchenOrders.mockResolvedValue([
      buildOrder({ id: "received-1", kitchenStatus: "received" }),
      buildOrder({ id: "ready-1", kitchenStatus: "ready" }),
    ]);

    const board = await getKitchenBoard();

    expect(board.received).toHaveLength(1);
    expect(board.preparing).toHaveLength(0);
    expect(board.ready).toHaveLength(1);
  });

  it("builds print-ready kitchen ticket payload with context and options", async () => {
    mocks.tx.order.findFirst.mockResolvedValue(
      buildOrder({
        orderType: "dine_in",
        tableId: "table-2",
        table: { name: "Table 2" },
        items: [
          {
            id: "item-1",
            productId: "product-1",
            variantId: null,
            productNameSnapshot: "Cafe Latte",
            variantNameSnapshot: null,
            quantity: "2",
            unitPrice: "25000",
            discountAmount: "0",
            lineTotal: "50000",
            notes: "No foam",
            createdAt: new Date("2026-04-29T09:00:00.000Z"),
            optionSelections: [
              {
                id: "selection-1",
                orderItemId: "item-1",
                optionGroupId: "group-temp",
                optionValueId: "value-iced",
                groupNameSnapshot: "Temperature",
                valueNameSnapshot: "Iced",
                priceDelta: "0",
                createdAt: new Date("2026-04-29T09:00:00.000Z"),
              },
              {
                id: "selection-2",
                orderItemId: "item-1",
                optionGroupId: "group-milk",
                optionValueId: "value-oat",
                groupNameSnapshot: "Milk",
                valueNameSnapshot: "Oat milk",
                priceDelta: "5000",
                createdAt: new Date("2026-04-29T09:00:00.000Z"),
              },
            ],
          },
        ],
      }),
    );

    const ticket = await getKitchenTicket("order-1");

    expect(ticket).toMatchObject({
      orderId: "order-1",
      orderNumber: "ORD-001",
      orderType: "dine_in",
      queueNumber: 5,
      tableName: "Table 2",
      items: [
        {
          name: "Cafe Latte",
          quantity: 2,
          notes: "No foam",
          options: [
            { groupName: "Temperature", valueName: "Iced" },
            { groupName: "Milk", valueName: "Oat milk" },
          ],
        },
      ],
    });
  });

  it("updates a valid status transition and logs it", async () => {
    const order = await changeKitchenStatus("order-1", "preparing", actor);

    expect(order.kitchenStatus).toBe("preparing");
    expect(mocks.tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kitchenStatus: "preparing",
          kitchenPreparingAt: expect.any(Date),
        }),
      }),
    );
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "kitchen.status_changed",
        entityType: "order",
        entityId: "order-1",
        metadata: expect.objectContaining({
          previousStatus: "received",
          status: "preparing",
          queueNumber: 5,
        }),
      }),
    });
  });

  it("rejects invalid backward transitions", async () => {
    mocks.tx.order.findFirst.mockResolvedValue(
      buildOrder({ kitchenStatus: "ready" }),
    );

    await expect(changeKitchenStatus("order-1", "preparing", actor)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(mocks.tx.order.update).not.toHaveBeenCalled();
  });

  it("rejects kitchen workflows when the module is disabled", async () => {
    const { ForbiddenError } = await import("@/lib/api-response");
    mocks.requireModuleEnabled.mockRejectedValueOnce(
      new ForbiddenError("Kitchen module is disabled."),
    );

    await expect(getKitchenBoard()).rejects.toBeInstanceOf(ForbiddenError);
    expect(mocks.listActiveKitchenOrders).not.toHaveBeenCalled();
  });
});
