import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const productInclude = {
  category: true,
  variants: {
    orderBy: { name: "asc" },
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

    return tx.product.findUniqueOrThrow({ where: { id }, include: productInclude });
  });
}
