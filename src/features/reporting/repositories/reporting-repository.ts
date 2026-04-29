import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const reportOrderLimit = 5_000;
const reportStockItemLimit = 1_000;

export function listReportOrders(filters: { paidFrom: Date; paidTo: Date }) {
  return prisma.order.findMany({
    where: {
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

export function listReportIngredients() {
  return prisma.ingredient.findMany({
    include: {
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

export function listReportProducts() {
  return prisma.product.findMany({
    where: { trackStock: true },
    include: {
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

export function listReportStockMovements(filters: { dateFrom: Date; dateTo: Date }) {
  return prisma.stockMovement.groupBy({
    by: ["type"],
    where: {
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
