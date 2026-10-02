import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/features/auth/types";

const reportOrderLimit = 5_000;
const reportStockItemLimit = 1_000;

export function listReportOrders(context: TenantContext, filters: { paidFrom: Date; paidTo: Date }) {
  return prisma.order.findMany({
    where: {
      organizationId: context.organizationId,
      outletId: context.outletId,
      status: { in: ["paid", "refunded"] },
      payments: {
        some: {
          status: { in: ["paid", "refunded"] },
          paidAt: {
            gte: filters.paidFrom,
            lt: filters.paidTo,
          },
        },
      },
    },
    include: {
      cashier: {
        select: {
          id: true,
          name: true,
        },
      },
      items: {
        orderBy: { createdAt: "asc" },
      },
      payments: {
        where: { status: { in: ["paid", "refunded"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      refunds: true,
    },
    orderBy: { paidAt: "desc" },
    take: reportOrderLimit,
  });
}

export type ReportOrderRow = Prisma.PromiseReturnType<typeof listReportOrders>[number];

export function listReportIngredients(context: TenantContext) {
  return prisma.ingredient.findMany({
    where: { organizationId: context.organizationId },
    include: {
      outletStocks: { where: { outletId: context.outletId }, take: 1 },
      stockMovements: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
    take: reportStockItemLimit,
  });
}

export type ReportIngredientRow = Prisma.PromiseReturnType<
  typeof listReportIngredients
>[number];

export function listReportProducts(context: TenantContext) {
  return prisma.product.findMany({
    where: { organizationId: context.organizationId, trackStock: true },
    include: {
      outletProducts: { where: { outletId: context.outletId }, take: 1 },
      stockMovements: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
    take: reportStockItemLimit,
  });
}

export type ReportProductRow = Prisma.PromiseReturnType<typeof listReportProducts>[number];

export function listReportStockMovements(context: TenantContext, filters: { dateFrom: Date; dateTo: Date }) {
  return prisma.stockMovement.groupBy({
    by: ["type"],
    where: {
      organizationId: context.organizationId,
      outletId: context.outletId,
      createdAt: {
        gte: filters.dateFrom,
        lt: filters.dateTo,
      },
    },
    _count: { _all: true },
    _sum: { quantityChange: true },
  });
}

export type ReportStockMovementRow = Prisma.PromiseReturnType<
  typeof listReportStockMovements
>[number];
