import type {
  Ingredient,
  Product,
  StockMovement,
  User,
} from "@prisma/client";
import type {
  IngredientRecord,
  ProductIngredientRecord,
  StockMovementRecord,
} from "../types";

export function getIngredientStockStatus(
  ingredient: Pick<Ingredient, "currentStock" | "lowStockThreshold" | "isActive">,
): IngredientRecord["stockStatus"] {
  if (!ingredient.isActive) return "inactive";
  const currentStock = Number(ingredient.currentStock);
  if (currentStock <= 0) return "out";
  if (
    ingredient.lowStockThreshold !== null &&
    currentStock <= Number(ingredient.lowStockThreshold)
  ) {
    return "low";
  }

  return "ok";
}

export function mapIngredient(ingredient: Ingredient): IngredientRecord {
  return {
    id: ingredient.id,
    name: ingredient.name,
    sku: ingredient.sku,
    unit: ingredient.unit,
    currentStock: Number(ingredient.currentStock),
    lowStockThreshold:
      ingredient.lowStockThreshold === null
        ? null
        : Number(ingredient.lowStockThreshold),
    isActive: ingredient.isActive,
    stockStatus: getIngredientStockStatus(ingredient),
    createdAt: ingredient.createdAt.toISOString(),
    updatedAt: ingredient.updatedAt.toISOString(),
  };
}

export function mapProductIngredient(recipe: {
  id: string;
  productId: string;
  variantId: string | null;
  ingredientId: string;
  quantityRequired: unknown;
  ingredient: Pick<Ingredient, "name" | "sku" | "unit">;
}): ProductIngredientRecord {
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

export function mapStockMovement(
  movement: StockMovement & {
    ingredient?: Pick<Ingredient, "name"> | null;
    product?: Pick<Product, "name"> | null;
    createdByUser?: Pick<User, "name"> | null;
  },
): StockMovementRecord {
  return {
    id: movement.id,
    ingredientId: movement.ingredientId,
    ingredientName: movement.ingredient?.name ?? null,
    productId: movement.productId,
    productName: movement.product?.name ?? null,
    orderId: movement.orderId,
    type: movement.type,
    quantityChange: Number(movement.quantityChange),
    reason: movement.reason,
    createdByUserName: movement.createdByUser?.name ?? null,
    createdAt: movement.createdAt.toISOString(),
  };
}
