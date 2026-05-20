import type {
  ProductOptionValueRecord,
  ProductRecord,
  SettingsRecord,
} from "@/features/catalog/types";

export interface SelectedOptionRecord {
  optionGroupId: string | null;
  optionValueId: string | null;
  groupName: string;
  valueName: string;
  priceDelta: number;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  selectedOptions: SelectedOptionRecord[];
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
  selectedOptions?: ProductOptionValueRecord[];
}

export interface CheckoutLineInput {
  productId: string;
  variantId: string | null;
  selectedOptionValueIds: string[];
  quantity: number;
  discountAmount: number;
  notes: string;
}

export type OrderType = "dine_in" | "takeaway" | "delivery";
export type CheckoutPaymentMethod = "cash" | "qris";

export interface CheckoutInput {
  orderType: OrderType;
  tableId?: string | null;
  deliveryCustomerName?: string | null;
  deliveryCustomerPhone?: string | null;
  deliveryAddress?: string | null;
  deliveryNotes?: string | null;
  paymentMethod: CheckoutPaymentMethod;
  items: CheckoutLineInput[];
  cashReceivedAmount: number | null;
  notes?: string | null;
}

export interface CashCheckoutInput {
  orderType?: OrderType;
  tableId?: string | null;
  deliveryCustomerName?: string | null;
  deliveryCustomerPhone?: string | null;
  deliveryAddress?: string | null;
  deliveryNotes?: string | null;
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
  optionSelections: CheckoutOrderItemOptionSelectionRecord[];
}

export interface CheckoutOrderItemOptionSelectionRecord {
  id: string;
  optionGroupId: string | null;
  optionValueId: string | null;
  groupNameSnapshot: string;
  valueNameSnapshot: string;
  priceDelta: number;
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
  orderType: OrderType;
  tableId: string | null;
  tableName: string | null;
  deliveryCustomerName: string | null;
  deliveryCustomerPhone: string | null;
  deliveryAddress: string | null;
  deliveryNotes: string | null;
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

export interface DiningTableRecord {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}
