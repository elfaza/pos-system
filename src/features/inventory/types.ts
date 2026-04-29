export interface IngredientRecord {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  currentStock: number;
  lowStockThreshold: number | null;
  isActive: boolean;
  stockStatus: "out" | "low" | "ok" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface ProductIngredientRecord {
  id: string;
  productId: string;
  variantId: string | null;
  ingredientId: string;
  ingredientName: string;
  ingredientSku: string | null;
  unit: string;
  quantityRequired: number;
}

export interface StockMovementRecord {
  id: string;
  ingredientId: string | null;
  ingredientName: string | null;
  productId: string | null;
  productName: string | null;
  orderId: string | null;
  type: "sale_deduction" | "adjustment" | "waste" | "refund_restore";
  quantityChange: number;
  reason: string | null;
  createdByUserName: string | null;
  createdAt: string;
}
