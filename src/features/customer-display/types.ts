import type { CartTotals, OrderType } from "@/features/checkout/types";

export type CustomerDisplayStatus = "idle" | "active" | "paid";

export interface CustomerDisplayItemRecord {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  selectedOptions: Array<{
    groupName: string;
    valueName: string;
    priceDelta: number;
  }>;
}

export interface CustomerDisplayRecord {
  status: CustomerDisplayStatus;
  storeName: string;
  orderType: OrderType | null;
  items: CustomerDisplayItemRecord[];
  totals: CartTotals;
  paidOrderNumber: string | null;
  updatedAt: string;
}

export interface CustomerDisplayUpdateInput {
  status: CustomerDisplayStatus;
  storeName: string;
  orderType?: OrderType | null;
  items: CustomerDisplayItemRecord[];
  totals: CartTotals;
  paidOrderNumber?: string | null;
}

export interface CustomerDisplayMenuItemRecord {
  id: string;
  name: string;
  imageUrl: string | null;
  price: number;
}

export interface CustomerDisplayMenuCategoryRecord {
  id: string;
  name: string;
  products: CustomerDisplayMenuItemRecord[];
}

export interface CustomerDisplayMenuRecord {
  categories: CustomerDisplayMenuCategoryRecord[];
}
