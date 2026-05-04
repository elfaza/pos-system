import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ingredientListLimit = 200;

export function listIngredients(filters: {
  search?: string;
  active?: boolean;
  lowStockOnly?: boolean;
}) {
  const search = filters.search?.trim();

  return prisma.ingredient.findMany({
    where: {
      ...(filters.active === undefined ? {} : { isActive: filters.active }),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(filters.lowStockOnly
        ? {
            isActive: true,
            lowStockThreshold: { not: null },
            currentStock: { lte: prisma.ingredient.fields.lowStockThreshold },
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: ingredientListLimit,
  });
}

export function countLowStockIngredients() {
  return prisma.ingredient.count({
    where: {
      isActive: true,
      lowStockThreshold: { not: null },
      currentStock: { lte: prisma.ingredient.fields.lowStockThreshold },
    },
  });
}

export function findIngredientById(id: string) {
  return prisma.ingredient.findUnique({ where: { id } });
}

export function createIngredient(data: {
  name: string;
  sku: string | null;
  unit: string;
  currentStock: string;
  lowStockThreshold: string | null;
  isActive: boolean;
}) {
  return prisma.ingredient.create({ data });
}

export function updateIngredient(
  id: string,
  data: {
    name: string;
    sku: string | null;
    unit: string;
    lowStockThreshold: string | null;
    isActive: boolean;
  },
) {
  return prisma.ingredient.update({ where: { id }, data });
}

export function listStockMovements(filters: {
  ingredientId?: string;
  type?: "sale_deduction" | "adjustment" | "waste" | "refund_restore";
  dateFrom?: Date;
  dateTo?: Date;
}) {
  return prisma.stockMovement.findMany({
    where: {
      ...(filters.ingredientId ? { ingredientId: filters.ingredientId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    },
    include: {
      ingredient: { select: { name: true } },
      product: { select: { name: true } },
      createdByUser: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function adjustIngredientStock(data: {
  ingredientId: string;
  quantity: string;
  direction: "increase" | "decrease";
  type: "adjustment" | "waste";
  reason: string;
  actorId: string;
}) {
  const quantity = new Prisma.Decimal(data.quantity);
  const quantityChange =
    data.direction === "increase" ? quantity : quantity.mul(-1);

  return prisma.$transaction(async (tx) => {
    const ingredient = await tx.ingredient.findUnique({
      where: { id: data.ingredientId },
    });
    if (!ingredient) return null;

    const nextStock = new Prisma.Decimal(ingredient.currentStock).plus(quantityChange);
    if (nextStock.lt(0)) {
      return { ingredient, insufficient: true as const };
    }

    const updatedIngredient = await tx.ingredient.update({
      where: { id: data.ingredientId },
      data: { currentStock: nextStock },
    });

    await tx.stockMovement.create({
      data: {
        ingredientId: data.ingredientId,
        type: data.type,
        quantityChange,
        reason: data.reason,
        createdByUserId: data.actorId,
      },
    });

    return { ingredient: updatedIngredient, insufficient: false as const };
  });
}
