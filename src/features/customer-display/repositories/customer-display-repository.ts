import { prisma } from "@/lib/prisma";
import type { CustomerDisplayStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

const DEFAULT_SCOPE_KEY = "default";

export async function findCustomerDisplayState(scopeKey = DEFAULT_SCOPE_KEY) {
  return prisma.customerDisplayState.findUnique({
    where: { scopeKey },
  });
}

export async function upsertCustomerDisplayState(data: {
  scopeKey?: string;
  status: CustomerDisplayStatus;
  storeName: string;
  payload: Prisma.InputJsonValue;
  paidOrderNumber: string | null;
  paidAt: Date | null;
}) {
  const scopeKey = data.scopeKey ?? DEFAULT_SCOPE_KEY;

  return prisma.customerDisplayState.upsert({
    where: { scopeKey },
    create: {
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
  });
}
