import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { orderHistoryInclude } from "@/features/checkout/repositories/order-repository";

export const kitchenOrderInclude = orderHistoryInclude;

export async function listActiveKitchenOrders() {
  return prisma.order.findMany({
    where: {
      status: "paid",
      queueNumber: { not: null },
      kitchenStatus: { in: ["received", "preparing", "ready"] },
    },
    include: kitchenOrderInclude,
    orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
  });
}

export async function listReadyQueueOrders() {
  return prisma.order.findMany({
    where: {
      status: "paid",
      queueNumber: { not: null },
      kitchenStatus: { in: ["received", "preparing", "ready"] },
    },
    include: kitchenOrderInclude,
    orderBy: [{ kitchenReadyAt: "asc" }, { paidAt: "asc" }, { createdAt: "asc" }],
  });
}

export async function findKitchenOrderById(
  id: string,
  tx: Prisma.TransactionClient = prisma,
) {
  return tx.order.findFirst({
    where: {
      id,
      status: "paid",
      queueNumber: { not: null },
    },
    include: kitchenOrderInclude,
  });
}

export async function updateKitchenOrderStatus(
  id: string,
  data: Prisma.OrderUpdateInput,
  tx: Prisma.TransactionClient,
) {
  return tx.order.update({
    where: { id },
    data,
    include: kitchenOrderInclude,
  });
}

export const kitchenStatuses = [
  "received",
  "preparing",
  "ready",
  "completed",
] as const;
