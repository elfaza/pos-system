export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

export interface ProductVariantRecord {
  id: string;
  name: string;
  sku: string | null;
  priceDelta: number;
  costDelta: number | null;
  isActive: boolean;
}

export interface ProductIngredientRecipeRecord {
  id: string;
  productId: string;
  variantId: string | null;
  ingredientId: string;
  ingredientName: string;
  ingredientSku: string | null;
  unit: string;
  quantityRequired: number;
}

export interface ProductRecord {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  sku: string | null;
  description: string | null;
  imageUrl: string | null;
  price: number;
  costPrice: number | null;
  trackStock: boolean;
  stockQuantity: number | null;
  lowStockThreshold: number | null;
  isAvailable: boolean;
  ingredientRecipeCount: number;
  canSellOne: boolean;
  unavailableReason: string | null;
  variants: ProductVariantRecord[];
  recipes: ProductIngredientRecipeRecord[];
}

export interface SettingsRecord {
  id: string;
  storeName: string;
  storeAddress: string | null;
  storePhone: string | null;
  logoUrl: string | null;
  taxEnabled: boolean;
  taxRate: number;
  serviceChargeEnabled: boolean;
  serviceChargeRate: number;
  refundWindowHours: number | null;
  autoRestoreStockOnRefund: boolean;
  receiptFooter: string | null;
  locale: string;
  currencyCode: string;
  timeZone: string;
  businessDayStartTime: string;
  cashPaymentEnabled: boolean;
  qrisPaymentEnabled: boolean;
  kitchenEnabled: boolean;
  queueEnabled: boolean;
  inventoryEnabled: boolean;
  accountingEnabled: boolean;
  reportingEnabled: boolean;
  receiptPrintingEnabled: boolean;
}
