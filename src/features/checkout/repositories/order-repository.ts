import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const checkoutOrderInclude = {
  items: {
    orderBy: { createdAt: "asc" },
  },
  payments: {
    orderBy: { createdAt: "desc" },
    take: 1,
  },
} satisfies Prisma.OrderInclude;

export const orderHistoryInclude = {
  cashier: {
    select: {
      name: true,
      email: true,
    },
  },
  items: {
    orderBy: { createdAt: "asc" },
  },
  payments: {
    orderBy: { createdAt: "desc" },
    take: 1,
  },
} satisfies Prisma.OrderInclude;

export type CheckoutTransactionClient = Prisma.TransactionClient;

export async function findProductsForCheckout(productIds: string[]) {
  return prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      category: true,
      variants: true,
      ingredients: {
        include: { ingredient: true },
      },
    },
  });
}

export async function listHeldOrdersForUser(user: { id: string; role: string }) {
  return prisma.order.findMany({
    where: {
      status: "held",
      ...(user.role === "admin" ? {} : { cashierId: user.id }),
    },
    include: checkoutOrderInclude,
    orderBy: { heldAt: "desc" },
  });
}

export async function findHeldOrderById(id: string, user: { id: string; role: string }) {
  return prisma.order.findFirst({
    where: {
      id,
      status: "held",
      ...(user.role === "admin" ? {} : { cashierId: user.id }),
    },
    include: checkoutOrderInclude,
  });
}

export async function listOrdersForUser(
  user: { id: string; role: string },
  filters: { status?: OrderStatus } = {},
) {
  return prisma.order.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(user.role === "admin" ? {} : { cashierId: user.id }),
    },
    include: orderHistoryInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function findOrderByIdForUser(
  id: string,
  user: { id: string; role: string },
) {
  return prisma.order.findFirst({
    where: {
      id,
      ...(user.role === "admin" ? {} : { cashierId: user.id }),
    },
    include: orderHistoryInclude,
  });
}
