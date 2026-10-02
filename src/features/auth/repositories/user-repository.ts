import type { TenantContext } from "@/features/auth/types";
import { prisma } from "@/lib/prisma";

export const userListLimit = 100;

export function listUsers(context: TenantContext) {
  return prisma.outletMembership.findMany({
    where: { organizationId: context.organizationId, outletId: context.outletId },
    include: { user: true },
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
    take: userListLimit,
  });
}
