import type { CheckoutOrderRecord } from "@/features/checkout/types";

export type KitchenStatus = NonNullable<CheckoutOrderRecord["kitchenStatus"]>;

export interface KitchenQueueRecord extends CheckoutOrderRecord {
  queueBusinessDate: string;
  queueNumber: number;
  kitchenStatus: KitchenStatus;
}

export interface KitchenBoardRecord {
  received: KitchenQueueRecord[];
  preparing: KitchenQueueRecord[];
  ready: KitchenQueueRecord[];
}

export interface QueueDisplayRecord {
  waiting: KitchenQueueRecord[];
  preparing: KitchenQueueRecord[];
  ready: KitchenQueueRecord[];
}
