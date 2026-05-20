import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/api-response";
import {
  toBoolean,
  toDecimalString,
  toInteger,
  toOptionalDecimalString,
} from "@/lib/number";
import type { User } from "@/features/auth/types";
import {
  createProduct,
  findProductById,
  listProducts,
  productListLimit,
  updateProduct,
} from "../repositories/product-repository";
import { mapProduct } from "./catalog-mappers";

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseOptionSelectionType(value: unknown): "single" | "multiple" {
  return value === "multiple" ? "multiple" : "single";
}

function parseRecipeRows(value: unknown, options: {
  fieldPrefix: string;
  duplicateMessage: string;
  includeVariantId?: boolean;
}) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();

  return value.map((rawRecipe, index) => {
    const recipe =
      rawRecipe && typeof rawRecipe === "object"
        ? (rawRecipe as Record<string, unknown>)
        : {};
    const ingredientId = optionalString(recipe.ingredientId) ?? "";
    const variantId = options.includeVariantId ? optionalString(recipe.variantId) : null;
    const quantityRequired = toDecimalString(recipe.quantityRequired, "");
    const fieldErrors: Record<string, string> = {};
    const duplicateKey = options.includeVariantId
      ? `${variantId ?? "base"}:${ingredientId}`
      : ingredientId;

    if (!ingredientId) {
      fieldErrors[`${options.fieldPrefix}.${index}.ingredientId`] =
        "Ingredient is required.";
    }
    if (quantityRequired === "" || Number(quantityRequired) <= 0) {
      fieldErrors[`${options.fieldPrefix}.${index}.quantityRequired`] =
        "Recipe quantity must be greater than 0.";
    }
    if (ingredientId && seen.has(duplicateKey)) {
      fieldErrors[`${options.fieldPrefix}.${index}.ingredientId`] =
        options.duplicateMessage;
    }
    seen.add(duplicateKey);

    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidationError("Product recipe validation failed.", fieldErrors);
    }

    return {
      ingredientId,
      variantId,
      quantityRequired,
    };
  });
}

function parseReplacementRules(value: unknown, fieldPrefix: string) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();

  return value.map((rawRule, index) => {
    const rule =
      rawRule && typeof rawRule === "object"
        ? (rawRule as Record<string, unknown>)
        : {};
    const replacedIngredientId = optionalString(rule.replacedIngredientId) ?? "";
    const replacementIngredientId = optionalString(rule.replacementIngredientId) ?? "";
    const quantityRequired = toDecimalString(rule.quantityRequired, "");
    const fieldErrors: Record<string, string> = {};

    if (!replacedIngredientId) {
      fieldErrors[`${fieldPrefix}.${index}.replacedIngredientId`] =
        "Replaced ingredient is required.";
    }
    if (!replacementIngredientId) {
      fieldErrors[`${fieldPrefix}.${index}.replacementIngredientId`] =
        "Replacement ingredient is required.";
    }
    if (
      replacedIngredientId &&
      replacementIngredientId &&
      replacedIngredientId === replacementIngredientId
    ) {
      fieldErrors[`${fieldPrefix}.${index}.replacementIngredientId`] =
        "Replacement ingredient must be different.";
    }
    if (quantityRequired === "" || Number(quantityRequired) <= 0) {
      fieldErrors[`${fieldPrefix}.${index}.quantityRequired`] =
        "Replacement quantity must be greater than 0.";
    }
    if (replacedIngredientId && seen.has(replacedIngredientId)) {
      fieldErrors[`${fieldPrefix}.${index}.replacedIngredientId`] =
        "This ingredient already has a replacement rule for this option value.";
    }
    seen.add(replacedIngredientId);

    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidationError("Product option validation failed.", fieldErrors);
    }

    return {
      replacedIngredientId,
      replacementIngredientId,
      quantityRequired,
    };
  });
}

function parseOptionGroups(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((rawGroup, groupIndex) => {
    const group =
      rawGroup && typeof rawGroup === "object"
        ? (rawGroup as Record<string, unknown>)
        : {};
    const name = optionalString(group.name) ?? "";
    const rawValues = Array.isArray(group.values) ? group.values : [];
    const values = rawValues.map((rawValue, valueIndex) => {
      const optionValue =
        rawValue && typeof rawValue === "object"
          ? (rawValue as Record<string, unknown>)
          : {};
      const valueName = optionalString(optionValue.name) ?? "";
      const fieldErrors: Record<string, string> = {};

      if (!valueName) {
        fieldErrors[`optionGroups.${groupIndex}.values.${valueIndex}.name`] =
          "Option value name is required.";
      }

      const priceDelta = toDecimalString(optionValue.priceDelta, "0");
      if (priceDelta === "" || Number(priceDelta) < 0) {
        fieldErrors[`optionGroups.${groupIndex}.values.${valueIndex}.priceDelta`] =
          "Option price delta must be greater than or equal to 0.";
      }

      if (Object.keys(fieldErrors).length > 0) {
        throw new ValidationError("Product option validation failed.", fieldErrors);
      }

      return {
        id: optionalString(optionValue.id) ?? undefined,
        name: valueName,
        priceDelta,
        sortOrder: valueIndex,
        isActive: toBoolean(optionValue.isActive, true),
        recipes: parseRecipeRows(optionValue.recipes, {
          fieldPrefix: `optionGroups.${groupIndex}.values.${valueIndex}.recipes`,
          duplicateMessage: "This ingredient is already used for this option value.",
        }).map((recipe) => ({
          ingredientId: recipe.ingredientId,
          quantityRequired: recipe.quantityRequired,
        })),
        replacementRules: parseReplacementRules(
          optionValue.replacementRules,
          `optionGroups.${groupIndex}.values.${valueIndex}.replacementRules`,
        ),
      };
    });
    const fieldErrors: Record<string, string> = {};

    if (!name) {
      fieldErrors[`optionGroups.${groupIndex}.name`] = "Option group name is required.";
    }
    if (!values.some((optionValue) => optionValue.isActive)) {
      fieldErrors[`optionGroups.${groupIndex}.values`] =
        "Add at least one active option value.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidationError("Product option validation failed.", fieldErrors);
    }

    return {
      id: optionalString(group.id) ?? undefined,
      name,
      selectionType: parseOptionSelectionType(group.selectionType),
      isRequired: toBoolean(group.isRequired, false),
      sortOrder: groupIndex,
      isActive: toBoolean(group.isActive, true),
      values,
    };
  });
}

function parseRecipes(value: unknown) {
  return parseRecipeRows(value, {
    fieldPrefix: "recipes",
    duplicateMessage: "This ingredient is already used for this product.",
  });
}

function parseProductPayload(payload: Record<string, unknown>) {
  const categoryId = optionalString(payload.categoryId) ?? "";
  const name = optionalString(payload.name) ?? "";
  const price = toDecimalString(payload.price, "");
  const trackStock = toBoolean(payload.trackStock, false);
  const stockQuantity = toOptionalDecimalString(payload.stockQuantity);
  const lowStockThreshold = toOptionalDecimalString(payload.lowStockThreshold);
  const fieldErrors: Record<string, string> = {};

  if (!categoryId) fieldErrors.categoryId = "Category is required.";
  if (!name) fieldErrors.name = "Product name is required.";
  if (price === "" || Number(price) < 0) {
    fieldErrors.price = "Price must be greater than or equal to 0.";
  }
  if (trackStock && stockQuantity !== null && Number(stockQuantity) < 0) {
    fieldErrors.stockQuantity = "Stock quantity must be greater than or equal to 0.";
  }
  if (lowStockThreshold !== null && Number(lowStockThreshold) < 0) {
    fieldErrors.lowStockThreshold =
      "Low stock threshold must be greater than or equal to 0.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError("Product validation failed.", fieldErrors);
  }

  return {
    categoryId,
    name,
    sku: optionalString(payload.sku),
    description: optionalString(payload.description),
    imageUrl: optionalString(payload.imageUrl),
    price,
    costPrice: toOptionalDecimalString(payload.costPrice),
    trackStock,
    stockQuantity: trackStock ? stockQuantity : null,
    lowStockThreshold: trackStock ? lowStockThreshold : null,
    isAvailable: toBoolean(payload.isAvailable, true),
    optionGroups: parseOptionGroups(payload.optionGroups),
    recipes: parseRecipes(payload.recipes),
  };
}

async function assertRecipesUseActiveIngredients(
  recipes: Array<{ ingredientId: string }>,
) {
  if (recipes.length === 0) return;

  const ingredientIds = [...new Set(recipes.map((recipe) => recipe.ingredientId))];
  const ingredients = await prisma.ingredient.findMany({
    where: { id: { in: ingredientIds } },
    select: { id: true, isActive: true },
  });
  const activeIngredientIds = new Set(
    ingredients
      .filter((ingredient) => ingredient.isActive)
      .map((ingredient) => ingredient.id),
  );
  const missingIngredient = ingredientIds.find((id) => !activeIngredientIds.has(id));

  if (missingIngredient) {
    throw new ValidationError("Product recipe validation failed.", {
      recipes: "Recipes can only use active ingredients.",
    });
  }
}

function getAllRecipeRows(data: ReturnType<typeof parseProductPayload>) {
  return [
    ...data.recipes,
    ...data.optionGroups.flatMap((group) =>
      group.values.flatMap((value) => [
        ...value.recipes,
        ...value.replacementRules.flatMap((rule) => [
          { ingredientId: rule.replacedIngredientId },
          { ingredientId: rule.replacementIngredientId },
        ]),
      ]),
    ),
  ];
}

export async function getProductList(url: URL, includeUnavailable: boolean) {
  const products = await listProducts({
    search: url.searchParams.get("search") ?? undefined,
    categoryId: url.searchParams.get("categoryId") ?? undefined,
    includeUnavailable,
  });
  return products.map(mapProduct);
}

export function getProductListLimit(): number {
  return productListLimit;
}

export async function createProductFromPayload(
  payload: Record<string, unknown>,
  actor: User,
) {
  const data = parseProductPayload(payload);
  await assertRecipesUseActiveIngredients(getAllRecipeRows(data));
  const product = await createProduct(data);

  await prisma.activityLog.create({
    data: {
      userId: actor.id,
      action: "product.created",
      entityType: "product",
      entityId: product.id,
    },
  });

  return mapProduct(product);
}

export async function updateProductFromPayload(
  id: string,
  payload: Record<string, unknown>,
  actor: User,
) {
  const existing = await findProductById(id);
  if (!existing) {
    throw new NotFoundError("Product was not found.");
  }

  const data = parseProductPayload(payload);
  await assertRecipesUseActiveIngredients(getAllRecipeRows(data));
  const product = await updateProduct(id, data);

  await prisma.activityLog.create({
    data: {
      userId: actor.id,
      action: "product.updated",
      entityType: "product",
      entityId: product.id,
    },
  });

  return mapProduct(product);
}

export function getVariantLimit(value: unknown): number {
  return toInteger(value, 0);
}
