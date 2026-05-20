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

export interface KitchenTicketOptionRecord {
  groupName: string;
  valueName: string;
}

export interface KitchenTicketItemRecord {
  id: string;
  name: string;
  quantity: number;
  notes: string | null;
  options: KitchenTicketOptionRecord[];
}

export interface KitchenTicketRecord {
  orderId: string;
  orderNumber: string;
  orderType: CheckoutOrderRecord["orderType"];
  queueBusinessDate: string;
  queueNumber: number;
  kitchenStatus: KitchenStatus;
  tableName: string | null;
  deliveryCustomerName: string | null;
  deliveryAddress: string | null;
  paidAt: string | null;
  items: KitchenTicketItemRecord[];
}
