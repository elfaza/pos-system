import type {
  AppSetting,
  Category,
  Ingredient,
  Product,
  ProductIngredient,
  ProductOptionGroup,
  ProductOptionValue,
  ProductOptionValueIngredient,
  ProductOptionValueIngredientReplacement,
} from "@prisma/client";
import type {
  CategoryRecord,
  ProductOptionGroupRecord,
  ProductRecord,
  ProductIngredientRecipeRecord,
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

export function mapOptionGroup(
  group: ProductOptionGroup & {
    values: Array<
      ProductOptionValue & {
        recipes?: Array<
          ProductOptionValueIngredient & {
            ingredient: Pick<Ingredient, "name" | "sku" | "unit">;
          }
        >;
        replacementRules?: Array<
          ProductOptionValueIngredientReplacement & {
            replacedIngredient: Pick<Ingredient, "name" | "sku" | "unit">;
            replacementIngredient: Pick<Ingredient, "name" | "sku" | "unit">;
          }
        >;
      }
    >;
  },
): ProductOptionGroupRecord {
  return {
    id: group.id,
    name: group.name,
    selectionType: group.selectionType,
    isRequired: group.isRequired,
    sortOrder: group.sortOrder,
    isActive: group.isActive,
    values: group.values.map((value) => ({
      id: value.id,
      groupId: value.groupId,
      name: value.name,
      priceDelta: Number(value.priceDelta),
      sortOrder: value.sortOrder,
      isActive: value.isActive,
      recipes: (value.recipes ?? []).map((recipe) => ({
        id: recipe.id,
        optionValueId: recipe.optionValueId,
        ingredientId: recipe.ingredientId,
        ingredientName: recipe.ingredient.name,
        ingredientSku: recipe.ingredient.sku,
        unit: recipe.ingredient.unit,
        quantityRequired: Number(recipe.quantityRequired),
      })),
      replacementRules: (value.replacementRules ?? []).map((rule) => ({
        id: rule.id,
        optionValueId: rule.optionValueId,
        replacedIngredientId: rule.replacedIngredientId,
        replacedIngredientName: rule.replacedIngredient.name,
        replacedIngredientSku: rule.replacedIngredient.sku,
        replacedUnit: rule.replacedIngredient.unit,
        replacementIngredientId: rule.replacementIngredientId,
        replacementIngredientName: rule.replacementIngredient.name,
        replacementIngredientSku: rule.replacementIngredient.sku,
        replacementUnit: rule.replacementIngredient.unit,
        quantityRequired: Number(rule.quantityRequired),
      })),
    })),
  };
}

function mapProductRecipe(
  recipe: ProductIngredient & {
    ingredient: Pick<Ingredient, "name" | "sku" | "unit">;
  },
): ProductIngredientRecipeRecord {
  return {
    id: recipe.id,
    productId: recipe.productId,
    variantId: recipe.variantId,
    ingredientId: recipe.ingredientId,
    ingredientName: recipe.ingredient.name,
    ingredientSku: recipe.ingredient.sku,
    unit: recipe.ingredient.unit,
    quantityRequired: Number(recipe.quantityRequired),
  };
}

function getCanSellOne(product: Product & {
  ingredients?: Array<
    ProductIngredient & {
      ingredient: Pick<Ingredient, "currentStock" | "isActive" | "name">;
    }
  >;
}) {
  if (!product.isAvailable) {
    return { canSellOne: false, unavailableReason: "Product unavailable" };
  }

  if (
    product.trackStock &&
    product.stockQuantity !== null &&
    Number(product.stockQuantity) <= 0
  ) {
    return { canSellOne: false, unavailableReason: "Product stock unavailable" };
  }

  for (const recipe of product.ingredients ?? []) {
    if (!recipe.ingredient.isActive) {
      return {
        canSellOne: false,
        unavailableReason: `${recipe.ingredient.name} inactive`,
      };
    }

    if (Number(recipe.ingredient.currentStock) < Number(recipe.quantityRequired)) {
      return {
        canSellOne: false,
        unavailableReason: `${recipe.ingredient.name} unavailable`,
      };
    }
  }

  return { canSellOne: true, unavailableReason: null };
}

export function mapProduct(
  product: Product & {
    category: { name: string };
    optionGroups?: Array<
      ProductOptionGroup & {
        values: Array<
          ProductOptionValue & {
            recipes?: Array<
              ProductOptionValueIngredient & {
                ingredient: Pick<Ingredient, "name" | "sku" | "unit">;
              }
            >;
            replacementRules?: Array<
              ProductOptionValueIngredientReplacement & {
                replacedIngredient: Pick<Ingredient, "name" | "sku" | "unit">;
                replacementIngredient: Pick<Ingredient, "name" | "sku" | "unit">;
              }
            >;
          }
        >;
      }
    >;
    ingredients?: Array<
      ProductIngredient & {
        ingredient: Pick<Ingredient, "name" | "sku" | "unit" | "currentStock" | "isActive">;
      }
    >;
  },
): ProductRecord {
  const availability = getCanSellOne(product);

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
    ingredientRecipeCount: product.ingredients?.length ?? 0,
    canSellOne: availability.canSellOne,
    unavailableReason: availability.unavailableReason,
    optionGroups: (product.optionGroups ?? []).map(mapOptionGroup),
    recipes: (product.ingredients ?? []).map(mapProductRecipe),
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
    locale: settings.locale,
    currencyCode: settings.currencyCode,
    timeZone: settings.timeZone,
    businessDayStartTime: settings.businessDayStartTime,
    cashPaymentEnabled: settings.cashPaymentEnabled,
    qrisPaymentEnabled: settings.qrisPaymentEnabled,
    dineInPayLaterEnabled: settings.dineInPayLaterEnabled,
    kitchenEnabled: settings.kitchenEnabled,
    queueEnabled: settings.queueEnabled,
    inventoryEnabled: settings.inventoryEnabled,
    accountingEnabled: settings.accountingEnabled,
    reportingEnabled: settings.reportingEnabled,
    receiptPrintingEnabled: settings.receiptPrintingEnabled,
  };
}
