import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/features/auth/types";
import { withTenantTransaction } from "@/lib/tenant-prisma";
import { orderHistoryInclude } from "@/features/checkout/repositories/order-repository";

export const kitchenOrderInclude = orderHistoryInclude;

export const activeKitchenOrderLimit = 100;

export async function listActiveKitchenOrders(tenant: TenantContext) {
  return withTenantTransaction(tenant, (tx) => tx.order.findMany({
    where: {
      organizationId: tenant.organizationId,
      outletId: tenant.outletId,
      status: "paid",
      queueNumber: { not: null },
      kitchenStatus: { in: ["received", "preparing", "ready"] },
    },
    include: kitchenOrderInclude,
    orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
    take: activeKitchenOrderLimit,
  }));
}

export async function listReadyQueueOrders(tenant: TenantContext) {
  return withTenantTransaction(tenant, (tx) => tx.order.findMany({
    where: {
      organizationId: tenant.organizationId,
      outletId: tenant.outletId,
      status: "paid",
      queueNumber: { not: null },
      kitchenStatus: { in: ["received", "preparing", "ready"] },
    },
    include: kitchenOrderInclude,
    orderBy: [{ kitchenReadyAt: "asc" }, { paidAt: "asc" }, { createdAt: "asc" }],
    take: activeKitchenOrderLimit,
  }));
}

export async function findKitchenOrderById(
  id: string,
  tenant: TenantContext,
  tx: Prisma.TransactionClient = prisma,
) {
  return tx.order.findFirst({
    where: {
      id,
      organizationId: tenant.organizationId,
      outletId: tenant.outletId,
      status: "paid",
      queueNumber: { not: null },
    },
    include: kitchenOrderInclude,
  });
}

export async function updateKitchenOrderStatus(
  id: string,
  tenant: TenantContext,
  data: Prisma.OrderUpdateInput,
  tx: Prisma.TransactionClient,
) {
  return tx.order.update({
    where: { id, organizationId: tenant.organizationId, outletId: tenant.outletId },
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
