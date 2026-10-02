import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import type { TenantContext } from "@/features/auth/types";

export type TenantTransactionClient = Pick<PrismaClient, "$transaction">;

export async function setDatabaseTenantContext(
  transaction: Prisma.TransactionClient,
  context: { userId?: string; organizationId?: string; outletId?: string; role?: TenantContext["role"] },
) {
  await transaction.$queryRaw`
    SELECT
      set_config('app.user_id', ${context.userId ?? ""}, true),
      set_config('app.organization_id', ${context.organizationId ?? ""}, true),
      set_config('app.outlet_id', ${context.outletId ?? ""}, true),
      set_config('app.organization_wide', ${context.role === "owner" ? "true" : "false"}, true)
  `;
}

export function withDatabaseUserContext<T>(userId: string, callback: (transaction: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (transaction) => {
    await setDatabaseTenantContext(transaction, { userId });
    return callback(transaction);
  });
}

export function createTenantTransactionRunner(client: TenantTransactionClient) {
  return function withTenantTransaction<T>(
    context: Pick<TenantContext, "organizationId" | "outletId"> & Partial<Pick<TenantContext, "userId" | "role">>,
    callback: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return client.$transaction(async (transaction) => {
      await setDatabaseTenantContext(transaction, {
        ...context,
      });
      return callback(transaction);
    });
  };
}

/** Tenant-bound request work must go through this helper. */
export const withTenantTransaction = createTenantTransactionRunner(prisma);
