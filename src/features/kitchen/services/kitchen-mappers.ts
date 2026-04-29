import { mapCheckoutOrder } from "@/features/checkout/services/checkout-mappers";
import type { CheckoutOrderRecord } from "@/features/checkout/types";
import type { KitchenBoardRecord, KitchenQueueRecord, QueueDisplayRecord } from "../types";

export function assertKitchenQueueRecord(
  order: CheckoutOrderRecord,
): KitchenQueueRecord {
  if (
    order.queueBusinessDate === null ||
    order.queueNumber === null ||
    order.kitchenStatus === null
  ) {
    throw new Error("Kitchen order is missing queue data.");
  }

  return {
    ...order,
    queueBusinessDate: order.queueBusinessDate,
    queueNumber: order.queueNumber,
    kitchenStatus: order.kitchenStatus,
  };
}

export function mapKitchenOrder(
  order: Parameters<typeof mapCheckoutOrder>[0],
): KitchenQueueRecord {
  return assertKitchenQueueRecord(mapCheckoutOrder(order));
}

export function buildKitchenBoard(orders: KitchenQueueRecord[]): KitchenBoardRecord {
  return {
    received: orders.filter((order) => order.kitchenStatus === "received"),
    preparing: orders.filter((order) => order.kitchenStatus === "preparing"),
    ready: orders.filter((order) => order.kitchenStatus === "ready"),
  };
}

export function buildQueueDisplay(orders: KitchenQueueRecord[]): QueueDisplayRecord {
  return {
    waiting: orders.filter((order) => order.kitchenStatus === "received"),
    preparing: orders.filter((order) => order.kitchenStatus === "preparing"),
    ready: orders.filter((order) => order.kitchenStatus === "ready"),
  };
}
