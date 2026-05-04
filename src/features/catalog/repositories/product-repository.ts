import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const productListLimit = 200;

const productInclude = {
  category: true,
  variants: {
    orderBy: { name: "asc" },
  },
  ingredients: {
    include: {
      ingredient: true,
    },
    orderBy: [{ variantId: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.ProductInclude;

export function listProducts(filters: {
  search?: string;
  categoryId?: string;
  includeUnavailable: boolean;
}) {
  const search = filters.search?.trim();

  return prisma.product.findMany({
    where: {
      ...(filters.includeUnavailable ? {} : { isAvailable: true, category: { isActive: true } }),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
              { category: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: productInclude,
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    take: productListLimit,
  });
}

export function findProductById(id: string) {
  return prisma.product.findUnique({ where: { id }, include: productInclude });
}

export async function createProduct(data: {
  categoryId: string;
  name: string;
  sku: string | null;
  description: string | null;
  imageUrl: string | null;
  price: string;
  costPrice: string | null;
  trackStock: boolean;
  stockQuantity: string | null;
  lowStockThreshold: string | null;
  isAvailable: boolean;
  variants: Array<{
    name: string;
    sku: string | null;
    priceDelta: string;
    costDelta: string | null;
    isActive: boolean;
  }>;
  recipes: Array<{
    ingredientId: string;
    variantId: string | null;
    quantityRequired: string;
  }>;
}) {
  return prisma.product.create({
    data: {
      categoryId: data.categoryId,
      name: data.name,
      sku: data.sku,
      description: data.description,
      imageUrl: data.imageUrl,
      price: data.price,
      costPrice: data.costPrice,
      trackStock: data.trackStock,
      stockQuantity: data.stockQuantity,
      lowStockThreshold: data.lowStockThreshold,
      isAvailable: data.isAvailable,
      variants: {
        create: data.variants,
      },
      ingredients: {
        create: data.recipes,
      },
    },
    include: productInclude,
  });
}

export async function updateProduct(
  id: string,
  data: {
    categoryId: string;
    name: string;
    sku: string | null;
    description: string | null;
    imageUrl: string | null;
    price: string;
    costPrice: string | null;
    trackStock: boolean;
    stockQuantity: string | null;
    lowStockThreshold: string | null;
    isAvailable: boolean;
    variants: Array<{
      id?: string;
      name: string;
      sku: string | null;
      priceDelta: string;
      costDelta: string | null;
      isActive: boolean;
    }>;
    recipes: Array<{
      ingredientId: string;
      variantId: string | null;
      quantityRequired: string;
    }>;
  },
) {
  const existingVariants = await prisma.productVariant.findMany({
    where: { productId: id },
    select: { id: true },
  });
  const incomingIds = new Set(data.variants.flatMap((variant) => (variant.id ? [variant.id] : [])));
  const deletedIds = existingVariants
    .map((variant) => variant.id)
    .filter((variantId) => !incomingIds.has(variantId));

  return prisma.$transaction(async (tx) => {
    if (deletedIds.length > 0) {
      await tx.productVariant.updateMany({
        where: { id: { in: deletedIds }, productId: id },
        data: { isActive: false },
      });
    }

    await tx.product.update({
      where: { id },
      data: {
        categoryId: data.categoryId,
        name: data.name,
        sku: data.sku,
        description: data.description,
        imageUrl: data.imageUrl,
        price: data.price,
        costPrice: data.costPrice,
        trackStock: data.trackStock,
        stockQuantity: data.stockQuantity,
        lowStockThreshold: data.lowStockThreshold,
        isAvailable: data.isAvailable,
      },
    });

    await tx.productIngredient.deleteMany({
      where: { productId: id },
    });

    for (const variant of data.variants) {
      if (variant.id) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            name: variant.name,
            sku: variant.sku,
            priceDelta: variant.priceDelta,
            costDelta: variant.costDelta,
            isActive: variant.isActive,
          },
        });
      } else {
        await tx.productVariant.create({
          data: {
            productId: id,
            name: variant.name,
            sku: variant.sku,
            priceDelta: variant.priceDelta,
            costDelta: variant.costDelta,
            isActive: variant.isActive,
          },
        });
      }
    }

    if (data.recipes.length > 0) {
      await tx.productIngredient.createMany({
        data: data.recipes.map((recipe) => ({
          productId: id,
          ingredientId: recipe.ingredientId,
          variantId: recipe.variantId,
          quantityRequired: recipe.quantityRequired,
        })),
      });
    }

    return tx.product.findUniqueOrThrow({ where: { id }, include: productInclude });
  });
}
