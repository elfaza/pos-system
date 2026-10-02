import type { CustomerDisplayStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { TenantContext } from "@/features/auth/types";
import { withTenantTransaction } from "@/lib/tenant-prisma";

function makeScopeKey(context: TenantContext) {
  return `${context.organizationId}:${context.outletId}`;
}

export async function findCustomerDisplayState(context: TenantContext) {
  const scopeKey = makeScopeKey(context);
  return withTenantTransaction(context, (tx) => tx.customerDisplayState.findFirst({
    where: { scopeKey, organizationId: context.organizationId, outletId: context.outletId },
  }));
}

export async function upsertCustomerDisplayState(data: {
  context: TenantContext;
  status: CustomerDisplayStatus;
  storeName: string;
  payload: Prisma.InputJsonValue;
  paidOrderNumber: string | null;
  paidAt: Date | null;
}) {
  const scopeKey = makeScopeKey(data.context);

  return withTenantTransaction(data.context, (tx) => tx.customerDisplayState.upsert({
    where: { scopeKey },
    create: {
      organizationId: data.context.organizationId,
      outletId: data.context.outletId,
      scopeKey,
      status: data.status,
      storeName: data.storeName,
      payload: data.payload,
      paidOrderNumber: data.paidOrderNumber,
      paidAt: data.paidAt,
    },
    update: {
      status: data.status,
      storeName: data.storeName,
      payload: data.payload,
      paidOrderNumber: data.paidOrderNumber,
      paidAt: data.paidAt,
    },
  }));
}
