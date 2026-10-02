import type { CustomerDisplayStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { TenantContext } from "@/features/auth/types";
import { withTenantTransaction } from "@/lib/tenant-prisma";

export async function findCustomerDisplayState(context: TenantContext) {
  return withTenantTransaction(context, (tx) => tx.customerDisplayState.findFirst({
    where: { organizationId: context.organizationId, outletId: context.outletId },
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
  return withTenantTransaction(data.context, (tx) => tx.customerDisplayState.upsert({
    where: { organizationId_outletId: { organizationId: data.context.organizationId, outletId: data.context.outletId } },
    create: {
      organizationId: data.context.organizationId,
      outletId: data.context.outletId,
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
