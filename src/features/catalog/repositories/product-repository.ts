import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const productListLimit = 200;

const productInclude = {
  category: true,
  optionGroups: {
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      values: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          recipes: {
            include: {
              ingredient: true,
            },
            orderBy: { createdAt: "asc" },
          },
          replacementRules: {
            include: {
              replacedIngredient: true,
              replacementIngredient: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
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
  optionGroups: Array<{
    name: string;
    selectionType: "single" | "multiple";
    isRequired: boolean;
    sortOrder: number;
    isActive: boolean;
    values: Array<{
      name: string;
      priceDelta: string;
      sortOrder: number;
      isActive: boolean;
      recipes: Array<{
        ingredientId: string;
        quantityRequired: string;
      }>;
      replacementRules: Array<{
        replacedIngredientId: string;
        replacementIngredientId: string;
        quantityRequired: string;
      }>;
    }>;
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
      optionGroups: {
        create: data.optionGroups.map((group) => ({
          name: group.name,
          selectionType: group.selectionType,
          isRequired: group.isRequired,
          sortOrder: group.sortOrder,
          isActive: group.isActive,
          values: {
            create: group.values.map((value) => ({
              name: value.name,
              priceDelta: value.priceDelta,
              sortOrder: value.sortOrder,
              isActive: value.isActive,
              recipes: {
                create: value.recipes,
              },
              replacementRules: {
                create: value.replacementRules,
              },
            })),
          },
        })),
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
    optionGroups: Array<{
      id?: string;
      name: string;
      selectionType: "single" | "multiple";
      isRequired: boolean;
      sortOrder: number;
      isActive: boolean;
      values: Array<{
        id?: string;
        name: string;
        priceDelta: string;
        sortOrder: number;
        isActive: boolean;
        recipes: Array<{
          ingredientId: string;
          quantityRequired: string;
        }>;
        replacementRules: Array<{
          replacedIngredientId: string;
          replacementIngredientId: string;
          quantityRequired: string;
        }>;
      }>;
    }>;
    recipes: Array<{
      ingredientId: string;
      variantId: string | null;
      quantityRequired: string;
    }>;
  },
) {
  const existingOptionGroups = await prisma.productOptionGroup.findMany({
    where: { productId: id },
    include: { values: true },
  });
  const incomingOptionGroupIds = new Set(
    data.optionGroups.flatMap((group) => (group.id ? [group.id] : [])),
  );
  const deletedOptionGroupIds = existingOptionGroups
    .map((group) => group.id)
    .filter((groupId) => !incomingOptionGroupIds.has(groupId));

  return prisma.$transaction(async (tx) => {
    if (deletedOptionGroupIds.length > 0) {
      await tx.productOptionGroup.updateMany({
        where: { id: { in: deletedOptionGroupIds }, productId: id },
        data: { isActive: false },
      });
      await tx.productOptionValue.updateMany({
        where: { groupId: { in: deletedOptionGroupIds } },
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

    for (const group of data.optionGroups) {
      if (group.id) {
        await tx.productOptionGroup.update({
          where: { id: group.id },
          data: {
            name: group.name,
            selectionType: group.selectionType,
            isRequired: group.isRequired,
            sortOrder: group.sortOrder,
            isActive: group.isActive,
          },
        });
      } else {
        await tx.productOptionGroup.create({
          data: {
            productId: id,
            name: group.name,
            selectionType: group.selectionType,
            isRequired: group.isRequired,
            sortOrder: group.sortOrder,
            isActive: group.isActive,
            values: {
              create: group.values.map((value) => ({
                name: value.name,
                priceDelta: value.priceDelta,
                sortOrder: value.sortOrder,
                isActive: value.isActive,
                recipes: {
                  create: value.recipes,
                },
                replacementRules: {
                  create: value.replacementRules,
                },
              })),
            },
          },
        });
        continue;
      }

      const existingGroup = existingOptionGroups.find(
        (candidate) => candidate.id === group.id,
      );
      const incomingValueIds = new Set(
        group.values.flatMap((value) => (value.id ? [value.id] : [])),
      );
      const deletedValueIds = (existingGroup?.values ?? [])
        .map((value) => value.id)
        .filter((valueId) => !incomingValueIds.has(valueId));

      if (deletedValueIds.length > 0) {
        await tx.productOptionValue.updateMany({
          where: { id: { in: deletedValueIds }, groupId: group.id },
          data: { isActive: false },
        });
      }

      for (const value of group.values) {
        if (value.id) {
          const optionValueId = value.id;
          await tx.productOptionValue.update({
            where: { id: optionValueId },
            data: {
              name: value.name,
              priceDelta: value.priceDelta,
              sortOrder: value.sortOrder,
              isActive: value.isActive,
            },
          });
          await tx.productOptionValueIngredient.deleteMany({
            where: { optionValueId },
          });
          await tx.productOptionValueIngredientReplacement.deleteMany({
            where: { optionValueId },
          });
          if (value.recipes.length > 0) {
            await tx.productOptionValueIngredient.createMany({
              data: value.recipes.map((recipe) => ({
                optionValueId,
                ingredientId: recipe.ingredientId,
                quantityRequired: recipe.quantityRequired,
              })),
            });
          }
          if (value.replacementRules.length > 0) {
            await tx.productOptionValueIngredientReplacement.createMany({
              data: value.replacementRules.map((rule) => ({
                optionValueId,
                replacedIngredientId: rule.replacedIngredientId,
                replacementIngredientId: rule.replacementIngredientId,
                quantityRequired: rule.quantityRequired,
              })),
            });
          }
        } else {
          await tx.productOptionValue.create({
            data: {
              groupId: group.id,
              name: value.name,
              priceDelta: value.priceDelta,
              sortOrder: value.sortOrder,
              isActive: value.isActive,
              recipes: {
                create: value.recipes,
              },
              replacementRules: {
                create: value.replacementRules,
              },
            },
          });
        }
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
