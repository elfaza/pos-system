import type { ProductRecord, ProductVariantRecord, SettingsRecord } from "@/features/catalog/types";

export interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  categoryName: string;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  notes: string;
  trackStock: boolean;
  stockQuantity: number | null;
}

export interface CartTotals {
  subtotalAmount: number;
  discountAmount: number;
  serviceChargeAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface AddCartItemInput {
  product: ProductRecord;
  variant?: ProductVariantRecord | null;
}

export interface CheckoutLineInput {
  productId: string;
  variantId: string | null;
  quantity: number;
  discountAmount: number;
  notes: string;
}

export interface CashCheckoutInput {
  items: CheckoutLineInput[];
  cashReceivedAmount: number;
  notes?: string | null;
}

export interface CheckoutOrderItemRecord {
  id: string;
  productId: string;
  variantId: string | null;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  notes: string | null;
}

export interface CheckoutPaymentRecord {
  id: string;
  method: "cash" | "qris";
  status: "pending" | "paid" | "failed" | "expired" | "refunded";
  amount: number;
  cashReceivedAmount: number | null;
  changeAmount: number | null;
  paidAt: string | null;
}

export interface CheckoutOrderRecord {
  id: string;
  orderNumber: string;
  cashierName: string | null;
  cashierEmail: string | null;
  status: "draft" | "held" | "pending_payment" | "paid" | "cancelled" | "refunded";
  queueBusinessDate: string | null;
  queueNumber: number | null;
  kitchenStatus: "received" | "preparing" | "ready" | "completed" | null;
  kitchenPreparingAt: string | null;
  kitchenReadyAt: string | null;
  kitchenCompletedAt: string | null;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  heldAt: string | null;
  paidAt: string | null;
  createdAt: string;
  items: CheckoutOrderItemRecord[];
  payment: CheckoutPaymentRecord | null;
}

export type CheckoutSettings = Pick<
  SettingsRecord,
  "taxEnabled" | "taxRate" | "serviceChargeEnabled" | "serviceChargeRate"
>;
