import type { AppSetting, Category, Product, ProductVariant } from "@prisma/client";
import type {
  CategoryRecord,
  ProductRecord,
  ProductVariantRecord,
  SettingsRecord,
} from "../types";

export function mapCategory(
  category: Category & { _count?: { products: number } },
): CategoryRecord {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    productCount: category._count?.products ?? 0,
  };
}

export function mapVariant(variant: ProductVariant): ProductVariantRecord {
  return {
    id: variant.id,
    name: variant.name,
    sku: variant.sku,
    priceDelta: Number(variant.priceDelta),
    costDelta: variant.costDelta === null ? null : Number(variant.costDelta),
    isActive: variant.isActive,
  };
}

export function mapProduct(
  product: Product & {
    category: { name: string };
    variants: ProductVariant[];
  },
): ProductRecord {
  return {
    id: product.id,
    categoryId: product.categoryId,
    categoryName: product.category.name,
    name: product.name,
    sku: product.sku,
    description: product.description,
    imageUrl: product.imageUrl,
    price: Number(product.price),
    costPrice: product.costPrice === null ? null : Number(product.costPrice),
    trackStock: product.trackStock,
    stockQuantity: product.stockQuantity === null ? null : Number(product.stockQuantity),
    lowStockThreshold:
      product.lowStockThreshold === null ? null : Number(product.lowStockThreshold),
    isAvailable: product.isAvailable,
    variants: product.variants.map(mapVariant),
  };
}

export function mapSettings(settings: AppSetting): SettingsRecord {
  return {
    id: settings.id,
    storeName: settings.storeName,
    storeAddress: settings.storeAddress,
    storePhone: settings.storePhone,
    logoUrl: settings.logoUrl,
    taxEnabled: settings.taxEnabled,
    taxRate: Number(settings.taxRate),
    serviceChargeEnabled: settings.serviceChargeEnabled,
    serviceChargeRate: Number(settings.serviceChargeRate),
    refundWindowHours: settings.refundWindowHours,
    autoRestoreStockOnRefund: settings.autoRestoreStockOnRefund,
    receiptFooter: settings.receiptFooter,
  };
}
