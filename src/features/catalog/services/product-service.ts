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
  updateProduct,
} from "../repositories/product-repository";
import { mapProduct } from "./catalog-mappers";

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseVariants(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((rawVariant, index) => {
    const variant =
      rawVariant && typeof rawVariant === "object"
        ? (rawVariant as Record<string, unknown>)
        : {};
    const name = optionalString(variant.name) ?? "";
    if (!name) {
      throw new ValidationError("Product validation failed.", {
        [`variants.${index}.name`]: "Variant name is required.",
      });
    }

    return {
      id: optionalString(variant.id) ?? undefined,
      name,
      sku: optionalString(variant.sku),
      priceDelta: toDecimalString(variant.priceDelta, "0"),
      costDelta: toOptionalDecimalString(variant.costDelta),
      isActive: toBoolean(variant.isActive, true),
    };
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
    variants: parseVariants(payload.variants),
  };
}

export async function getProductList(url: URL, includeUnavailable: boolean) {
  const products = await listProducts({
    search: url.searchParams.get("search") ?? undefined,
    categoryId: url.searchParams.get("categoryId") ?? undefined,
    includeUnavailable,
  });
  return products.map(mapProduct);
}

export async function createProductFromPayload(
  payload: Record<string, unknown>,
  actor: User,
) {
  const data = parseProductPayload(payload);
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
