import type { Prisma } from "@prisma/client";
import { withTenantTransaction } from "@/lib/tenant-prisma";
import { NotFoundError, ValidationError } from "@/lib/api-response";
import {
  toBoolean,
  toDecimalString,
  toInteger,
  toOptionalDecimalString,
} from "@/lib/number";
import type { TenantContext } from "@/features/auth/types";
import {
  createProduct,
  findProductById,
  listProducts,
  productListLimit,
  updateProduct,
} from "../repositories/product-repository";
import { mapProduct } from "./catalog-mappers";

function mapOutletProduct(product: NonNullable<Awaited<ReturnType<typeof findProductById>>>) {
  const outletProduct = product.outletProducts?.[0];
  return mapProduct({
    ...product,
    isAvailable: outletProduct?.isAvailable ?? false,
    stockQuantity: outletProduct?.stockQuantity ?? null,
    lowStockThreshold: outletProduct?.lowStockThreshold ?? null,
    ingredients: product.ingredients.map((recipe) => ({
      ...recipe,
      ingredient: {
        ...recipe.ingredient,
        currentStock: recipe.ingredient.outletStocks[0]?.currentStock ?? 0,
      },
    })),
  });
}

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
  tx: Prisma.TransactionClient,
  organizationId: string,
  recipes: Array<{ ingredientId: string }>,
) {
  if (recipes.length === 0) return;

  const ingredientIds = [...new Set(recipes.map((recipe) => recipe.ingredientId))];
  const ingredients = await tx.ingredient.findMany({
    where: { id: { in: ingredientIds }, organizationId },
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

async function assertCategoryBelongsToOrganization(
  tx: Prisma.TransactionClient,
  organizationId: string,
  categoryId: string,
) {
  const category = await tx.category.findFirst({
    where: { id: categoryId, organizationId },
    select: { id: true },
  });
  if (!category) {
    throw new ValidationError("Product validation failed.", {
      categoryId: "Choose a category in this organization.",
    });
  }
}

async function assertVariantsBelongToProduct(
  tx: Prisma.TransactionClient,
  organizationId: string,
  productId: string | null,
  recipes: Array<{ variantId: string | null }>,
) {
  const variantIds = [...new Set(recipes.flatMap((recipe) => recipe.variantId ? [recipe.variantId] : []))];
  if (variantIds.length === 0) return;
  if (!productId) {
    throw new ValidationError("Product recipe validation failed.", {
      recipes: "Variants must belong to the product being updated.",
    });
  }
  const variants = await tx.productVariant.findMany({
    where: {
      id: { in: variantIds },
      ...(productId ? { productId } : {}),
      product: { organizationId },
    },
    select: { id: true },
  });
  if (variants.length !== variantIds.length) {
    throw new ValidationError("Product recipe validation failed.", {
      recipes: "Recipes can only use variants from this product and organization.",
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

export async function getProductList(context: TenantContext, url: URL, includeUnavailable: boolean) {
  const products = await withTenantTransaction(context, (tx) => listProducts(tx, context.organizationId, context.outletId, {
    search: url.searchParams.get("search") ?? undefined,
    categoryId: url.searchParams.get("categoryId") ?? undefined,
    includeUnavailable,
  }));
  return products.map(mapOutletProduct);
}

export async function getAvailableProductList(context: TenantContext) {
  const products = await withTenantTransaction(context, (tx) =>
    listProducts(tx, context.organizationId, context.outletId, { includeUnavailable: false }),
  );
  return products.map(mapOutletProduct);
}

export function getProductListLimit(): number {
  return productListLimit;
}

export async function createProductFromPayload(
  payload: Record<string, unknown>,
  context: TenantContext,
) {
  const data = parseProductPayload(payload);
  const product = await withTenantTransaction(context, async (tx) => {
    await assertCategoryBelongsToOrganization(tx, context.organizationId, data.categoryId);
    await assertRecipesUseActiveIngredients(tx, context.organizationId, getAllRecipeRows(data));
    await assertVariantsBelongToProduct(tx, context.organizationId, null, data.recipes);
    const created = await createProduct(tx, context.organizationId, context.outletId, data);
    await tx.activityLog.create({
      data: {
        userId: context.userId,
        organizationId: context.organizationId,
        outletId: context.outletId,
        action: "product.created",
        entityType: "product",
        entityId: created.id,
      },
    });
    return created;
  });

  return mapOutletProduct(product);
}

export async function updateProductFromPayload(
  id: string,
  payload: Record<string, unknown>,
  context: TenantContext,
) {
  const data = parseProductPayload(payload);
  const product = await withTenantTransaction(context, async (tx) => {
    const existing = await findProductById(tx, context.organizationId, context.outletId, id);
    if (!existing) throw new NotFoundError("Product was not found.");
    await assertCategoryBelongsToOrganization(tx, context.organizationId, data.categoryId);
    await assertRecipesUseActiveIngredients(tx, context.organizationId, getAllRecipeRows(data));
    await assertVariantsBelongToProduct(tx, context.organizationId, id, data.recipes);
    const updated = await updateProduct(tx, context.organizationId, context.outletId, id, data);
    if (!updated) throw new NotFoundError("Product was not found.");
    await tx.activityLog.create({
      data: {
        userId: context.userId,
        organizationId: context.organizationId,
        outletId: context.outletId,
        action: "product.updated",
        entityType: "product",
        entityId: updated.id,
      },
    });
    return updated;
  });

  return mapOutletProduct(product);
}

export function getVariantLimit(value: unknown): number {
  return toInteger(value, 0);
}
