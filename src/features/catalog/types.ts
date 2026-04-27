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
  variants: ProductVariantRecord[];
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
}
