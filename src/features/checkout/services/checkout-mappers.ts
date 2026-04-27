import type { Order, OrderItem, Payment, User as PrismaUser } from "@prisma/client";
import type { CheckoutOrderRecord } from "../types";

export function mapCheckoutOrder(
  order: Order & {
    cashier?: Pick<PrismaUser, "name" | "email">;
    items: OrderItem[];
    payments: Payment[];
  },
): CheckoutOrderRecord {
  const payment = order.payments[0] ?? null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    cashierName: order.cashier?.name ?? null,
    cashierEmail: order.cashier?.email ?? null,
    status: order.status,
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
