import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import type { TenantContext } from "@/features/auth/types";

export type TenantTransactionClient = Pick<PrismaClient, "$transaction">;

export function createTenantTransactionRunner(client: TenantTransactionClient) {
  return function withTenantTransaction<T>(
    context: Pick<TenantContext, "organizationId" | "outletId">,
    callback: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return client.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT
          set_config('app.organization_id', ${context.organizationId}, true),
          set_config('app.outlet_id', ${context.outletId}, true)
      `;
      return callback(transaction);
    });
  };
}

/** Tenant-bound request work must go through this helper. */
export const withTenantTransaction = createTenantTransactionRunner(prisma);
