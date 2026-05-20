import type {
  Order,
  OrderItem,
  OrderItemOptionSelection,
  Payment,
  DiningTable,
  User as PrismaUser,
} from "@prisma/client";
import type { CheckoutOrderRecord } from "../types";

export function mapCheckoutOrder(
  order: Order & {
    cashier?: Pick<PrismaUser, "name" | "email">;
    table?: Pick<DiningTable, "name"> | null;
    items: Array<OrderItem & { optionSelections?: OrderItemOptionSelection[] }>;
    payments: Payment[];
  },
): CheckoutOrderRecord {
  const payment = order.payments[0] ?? null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    tableId: order.tableId ?? null,
    tableName: order.table?.name ?? null,
    deliveryCustomerName: order.deliveryCustomerName ?? null,
    deliveryCustomerPhone: order.deliveryCustomerPhone ?? null,
    deliveryAddress: order.deliveryAddress ?? null,
    deliveryNotes: order.deliveryNotes ?? null,
    cashierName: order.cashier?.name ?? null,
    cashierEmail: order.cashier?.email ?? null,
    status: order.status,
    queueBusinessDate: order.queueBusinessDate,
    queueNumber: order.queueNumber,
    kitchenStatus: order.kitchenStatus,
    kitchenPreparingAt: order.kitchenPreparingAt?.toISOString() ?? null,
    kitchenReadyAt: order.kitchenReadyAt?.toISOString() ?? null,
    kitchenCompletedAt: order.kitchenCompletedAt?.toISOString() ?? null,
    subtotalAmount: Number(order.subtotalAmount),
    discountAmount: Number(order.discountAmount),
    taxAmount: Number(order.taxAmount),
    serviceChargeAmount: Number(order.serviceChargeAmount),
    totalAmount: Number(order.totalAmount),
    heldAt: order.heldAt?.toISOString() ?? null,
    paidAt: order.paidAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      productNameSnapshot: item.productNameSnapshot,
      variantNameSnapshot: item.variantNameSnapshot,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountAmount: Number(item.discountAmount),
      lineTotal: Number(item.lineTotal),
      notes: item.notes,
      optionSelections: (item.optionSelections ?? []).map((selection) => ({
        id: selection.id,
        optionGroupId: selection.optionGroupId,
        optionValueId: selection.optionValueId,
        groupNameSnapshot: selection.groupNameSnapshot,
        valueNameSnapshot: selection.valueNameSnapshot,
        priceDelta: Number(selection.priceDelta),
      })),
    })),
    payment: payment
      ? {
          id: payment.id,
          method: payment.method,
          status: payment.status,
          amount: Number(payment.amount),
          cashReceivedAmount:
            payment.cashReceivedAmount === null
              ? null
              : Number(payment.cashReceivedAmount),
          changeAmount:
            payment.changeAmount === null ? null : Number(payment.changeAmount),
          paidAt: payment.paidAt?.toISOString() ?? null,
        }
      : null,
  };
}
