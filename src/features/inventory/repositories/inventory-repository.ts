import { Prisma, type Ingredient } from "@prisma/client";
import type { TenantContext } from "@/features/auth/types";
import { withTenantTransaction } from "@/lib/tenant-prisma";

export const ingredientListLimit = 200;

type IngredientWithBalance = Omit<Ingredient, "currentStock" | "lowStockThreshold"> & {
  currentStock: Prisma.Decimal;
  lowStockThreshold: Prisma.Decimal | null;
};

function withOutletBalance(
  ingredient: Ingredient & { outletStocks: Array<{ currentStock: Prisma.Decimal; lowStockThreshold: Prisma.Decimal | null }> },
): IngredientWithBalance {
  const balance = ingredient.outletStocks[0];
  return {
    ...ingredient,
    currentStock: balance?.currentStock ?? new Prisma.Decimal(0),
    lowStockThreshold: balance?.lowStockThreshold ?? null,
  };
}

export async function listIngredients(context: TenantContext, filters: {
  search?: string;
  active?: boolean;
  lowStockOnly?: boolean;
}) {
  const search = filters.search?.trim();
  return withTenantTransaction(context, async (tx) => {
    const ingredients = await tx.ingredient.findMany({
      where: {
        organizationId: context.organizationId,
        ...(filters.active === undefined ? {} : { isActive: filters.active }),
        ...(search
          ? { OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
            ] }
          : {}),
      },
      include: { outletStocks: { where: { outletId: context.outletId }, take: 1 } },
      orderBy: { name: "asc" },
    });
    const mapped = ingredients.map(withOutletBalance).filter((ingredient) =>
      !filters.lowStockOnly || (
        ingredient.isActive && ingredient.lowStockThreshold !== null &&
        ingredient.currentStock.lte(ingredient.lowStockThreshold)
      ),
    );
    return mapped.slice(0, ingredientListLimit);
  });
}

export async function countLowStockIngredients(context: TenantContext) {
  return withTenantTransaction(context, async (tx) => {
    const ingredients = await tx.ingredient.findMany({
      where: { organizationId: context.organizationId, isActive: true },
      include: { outletStocks: { where: { outletId: context.outletId }, take: 1 } },
    });
    return ingredients.map(withOutletBalance).filter((ingredient) =>
      ingredient.lowStockThreshold !== null && ingredient.currentStock.lte(ingredient.lowStockThreshold),
    ).length;
  });
}

export async function findIngredientById(context: TenantContext, id: string) {
  return withTenantTransaction(context, async (tx) => {
    const ingredient = await tx.ingredient.findFirst({
      where: { id, organizationId: context.organizationId },
      include: { outletStocks: { where: { outletId: context.outletId }, take: 1 } },
    });
    return ingredient ? withOutletBalance(ingredient) : null;
  });
}

export async function createIngredient(context: TenantContext, data: {
  name: string;
  sku: string | null;
  unit: string;
  currentStock: string;
  lowStockThreshold: string | null;
  isActive: boolean;
}) {
  return withTenantTransaction(context, async (tx) => {
    const ingredient = await tx.ingredient.create({
      data: {
        organizationId: context.organizationId,
        name: data.name,
        sku: data.sku,
        unit: data.unit,
        isActive: data.isActive,
      },
    });
    const balance = await tx.outletIngredientStock.create({
      data: {
        outletId: context.outletId,
        ingredientId: ingredient.id,
        currentStock: data.currentStock,
        lowStockThreshold: data.lowStockThreshold,
      },
    });
    await tx.activityLog.create({
      data: {
        userId: context.userId,
        organizationId: context.organizationId,
        outletId: context.outletId,
        action: "ingredient.created",
        entityType: "ingredient",
        entityId: ingredient.id,
      },
    });
    return { ...ingredient, currentStock: balance.currentStock, lowStockThreshold: balance.lowStockThreshold };
  });
}

export async function updateIngredient(context: TenantContext, id: string, data: {
  name: string;
  sku: string | null;
  unit: string;
  lowStockThreshold: string | null;
  isActive: boolean;
}) {
  return withTenantTransaction(context, async (tx) => {
    const existing = await tx.ingredient.findFirst({
      where: { id, organizationId: context.organizationId },
      select: { id: true },
    });
    if (!existing) return null;
    const updated = await tx.ingredient.updateMany({
      where: { id, organizationId: context.organizationId },
      data: { name: data.name, sku: data.sku, unit: data.unit, isActive: data.isActive },
    });
    if (updated.count === 0) return null;
    await tx.outletIngredientStock.upsert({
      where: { outletId_ingredientId: { outletId: context.outletId, ingredientId: id } },
      update: { lowStockThreshold: data.lowStockThreshold },
      create: { outletId: context.outletId, ingredientId: id, currentStock: "0", lowStockThreshold: data.lowStockThreshold },
    });
    await tx.activityLog.create({
      data: {
        userId: context.userId,
        organizationId: context.organizationId,
        outletId: context.outletId,
        action: "ingredient.updated",
        entityType: "ingredient",
        entityId: id,
      },
    });
    const ingredient = await tx.ingredient.findFirstOrThrow({
      where: { id, organizationId: context.organizationId },
      include: { outletStocks: { where: { outletId: context.outletId }, take: 1 } },
    });
    return withOutletBalance(ingredient);
  });
}

export async function deleteUnusedIngredient(context: TenantContext, id: string) {
  return withTenantTransaction(context, async (tx) => {
    await tx.$queryRaw`SELECT id FROM ingredients WHERE id = ${id} AND organization_id = ${context.organizationId} FOR UPDATE`;

    const result = await tx.ingredient.deleteMany({
      where: {
        id,
        organizationId: context.organizationId,
        outletStocks: { none: { currentStock: { not: 0 } } },
        productIngredients: { none: {} },
        optionValueIngredients: { none: {} },
        optionValueReplacementSources: { none: {} },
        optionValueReplacementTargets: { none: {} },
        stockMovements: { none: {} },
      },
    });
    if (result.count === 0) {
      const existing = await tx.ingredient.findFirst({
        where: { id, organizationId: context.organizationId },
        select: { id: true },
      });
      return existing ? "in_use" as const : "not_found" as const;
    }

    await tx.activityLog.create({
      data: {
        userId: context.userId,
        organizationId: context.organizationId,
        outletId: context.outletId,
        action: "ingredient.deleted",
        entityType: "ingredient",
        entityId: id,
      },
    });
    return "deleted" as const;
  });
}

export async function listStockMovements(context: TenantContext, filters: {
  ingredientId?: string;
  type?: "sale_deduction" | "adjustment" | "waste" | "refund_restore";
  dateFrom?: Date;
  dateTo?: Date;
}) {
  return withTenantTransaction(context, (tx) => tx.stockMovement.findMany({
    where: {
      organizationId: context.organizationId,
      outletId: context.outletId,
      ...(filters.ingredientId ? { ingredientId: filters.ingredientId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? { createdAt: {
            ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
            ...(filters.dateTo ? { lte: filters.dateTo } : {}),
          } }
        : {}),
    },
    include: {
      ingredient: { select: { name: true } },
      product: { select: { name: true } },
      createdByUser: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  }));
}

export async function adjustIngredientStock(context: TenantContext, data: {
  ingredientId: string;
  quantity: string;
  direction: "increase" | "decrease";
  type: "adjustment" | "waste";
  reason: string;
}) {
  const quantity = new Prisma.Decimal(data.quantity);
  const quantityChange = data.direction === "increase" ? quantity : quantity.mul(-1);

  return withTenantTransaction(context, async (tx) => {
    const ingredient = await tx.ingredient.findFirst({
      where: { id: data.ingredientId, organizationId: context.organizationId },
      include: { outletStocks: { where: { outletId: context.outletId }, take: 1 } },
    });
    if (!ingredient) return null;

    let balance = ingredient.outletStocks[0];
    if (!balance) {
      balance = await tx.outletIngredientStock.create({
        data: { outletId: context.outletId, ingredientId: ingredient.id, currentStock: "0" },
      });
    }
    const nextStock = new Prisma.Decimal(balance.currentStock).plus(quantityChange);
    if (nextStock.lt(0)) {
      return { ingredient: withOutletBalance({ ...ingredient, outletStocks: [balance] }), insufficient: true as const };
    }

    const updated = await tx.outletIngredientStock.updateMany({
      where: {
        outletId: context.outletId,
        ingredientId: ingredient.id,
        ...(data.direction === "decrease" ? { currentStock: { gte: quantity } } : {}),
      },
      data: { currentStock: { increment: quantityChange } },
    });
    if (updated.count === 0) {
      const latestIngredient = await tx.ingredient.findFirstOrThrow({
        where: { id: ingredient.id, organizationId: context.organizationId },
        include: { outletStocks: { where: { outletId: context.outletId }, take: 1 } },
      });
      return { ingredient: withOutletBalance(latestIngredient), insufficient: true as const };
    }
    const updatedBalance = await tx.outletIngredientStock.findUniqueOrThrow({
      where: { outletId_ingredientId: { outletId: context.outletId, ingredientId: ingredient.id } },
    });
    await tx.stockMovement.create({
      data: {
        organizationId: context.organizationId,
        outletId: context.outletId,
        ingredientId: ingredient.id,
        type: data.type,
        quantityChange,
        reason: data.reason,
        createdByUserId: context.userId,
      },
    });
    await tx.activityLog.create({
      data: {
        userId: context.userId,
        organizationId: context.organizationId,
        outletId: context.outletId,
        action: `ingredient.${data.type}`,
        entityType: "ingredient",
        entityId: ingredient.id,
        metadata: { quantityChange: quantityChange.toString(), reason: data.reason },
      },
    });
    return {
      ingredient: withOutletBalance({ ...ingredient, outletStocks: [updatedBalance] }),
      insufficient: false as const,
    };
  });
}
