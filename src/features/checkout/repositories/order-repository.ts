import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/features/auth/types";

export const checkoutOrderInclude = {
  table: true,
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      optionSelections: {
        orderBy: { createdAt: "asc" },
      },
    },
  },
  payments: {
    orderBy: { createdAt: "desc" },
    take: 1,
  },
} satisfies Prisma.OrderInclude;

export const orderHistoryInclude = {
  table: true,
  cashier: {
    select: {
      name: true,
      email: true,
    },
  },
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      optionSelections: {
        orderBy: { createdAt: "asc" },
      },
    },
  },
  payments: {
    orderBy: { createdAt: "desc" },
    take: 1,
  },
} satisfies Prisma.OrderInclude;

export type CheckoutTransactionClient = Prisma.TransactionClient;

export const heldOrderListLimit = 100;

export async function findProductsForCheckout(tenant: TenantContext, productIds: string[]) {
  return prisma.product.findMany({
    where: {
      organizationId: tenant.organizationId,
      id: { in: productIds },
      outletProducts: { some: { outletId: tenant.outletId, isAvailable: true } },
    },
    include: {
      category: true,
      optionGroups: {
        include: {
          values: {
            include: {
              recipes: {
                include: {
                  ingredient: { include: { outletStocks: { where: { outletId: tenant.outletId }, take: 1 } } },
                },
              },
              replacementRules: {
                include: {
                  replacedIngredient: { include: { outletStocks: { where: { outletId: tenant.outletId }, take: 1 } } },
                  replacementIngredient: { include: { outletStocks: { where: { outletId: tenant.outletId }, take: 1 } } },
                },
              },
            },
          },
        },
      },
      ingredients: {
        include: { ingredient: { include: { outletStocks: { where: { outletId: tenant.outletId }, take: 1 } } } },
      },
      outletProducts: { where: { outletId: tenant.outletId }, take: 1 },
    },
  });
}

export async function listHeldOrdersForUser(tenant: TenantContext, user: { id: string; role: string }) {
  return prisma.order.findMany({
    where: {
      status: "held",
      organizationId: tenant.organizationId,
      outletId: tenant.outletId,
      ...(user.role === "admin" ? {} : { cashierId: user.id }),
    },
    include: checkoutOrderInclude,
    orderBy: { heldAt: "desc" },
    take: heldOrderListLimit,
  });
}

export async function findHeldOrderById(tenant: TenantContext, id: string, user: { id: string; role: string }) {
  return prisma.order.findFirst({
    where: {
      id,
      status: "held",
      organizationId: tenant.organizationId,
      outletId: tenant.outletId,
      ...(user.role === "admin" ? {} : { cashierId: user.id }),
    },
    include: checkoutOrderInclude,
  });
}

export async function listOrdersForUser(
  tenant: TenantContext,
  user: { id: string; role: string },
  filters: {
    status?: OrderStatus;
    paymentMethod?: PaymentMethod;
    paymentStatus?: PaymentStatus;
    paidFrom?: Date;
    paidTo?: Date;
  } = {},
) {
  const paymentFilter: Prisma.PaymentWhereInput = {
    ...(filters.paymentMethod ? { method: filters.paymentMethod } : {}),
    ...(filters.paymentStatus ? { status: filters.paymentStatus } : {}),
    ...(filters.paidFrom || filters.paidTo
      ? {
          paidAt: {
            ...(filters.paidFrom ? { gte: filters.paidFrom } : {}),
            ...(filters.paidTo ? { lte: filters.paidTo } : {}),
          },
        }
      : {}),
  };
  const hasPaymentFilter = Object.keys(paymentFilter).length > 0;

  return prisma.order.findMany({
    where: {
      organizationId: tenant.organizationId,
      outletId: tenant.outletId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(hasPaymentFilter ? { payments: { some: paymentFilter } } : {}),
      ...(user.role === "admin" ? {} : { cashierId: user.id }),
    },
    include: orderHistoryInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function findOrderByIdForUser(
  tenant: TenantContext,
  id: string,
  user: { id: string; role: string },
) {
  return prisma.order.findFirst({
    where: {
      id,
      organizationId: tenant.organizationId,
      outletId: tenant.outletId,
      ...(user.role === "admin" ? {} : { cashierId: user.id }),
    },
    include: orderHistoryInclude,
  });
}
