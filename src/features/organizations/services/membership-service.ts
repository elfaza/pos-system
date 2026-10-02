import type { UserRole } from "@prisma/client";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/api-response";
import { requireTenantContext } from "@/features/auth/services/session-service";
import { hashPassword } from "@/features/auth/utils/password";
import { withTenantTransaction } from "@/lib/tenant-prisma";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/features/auth/types";

const outletRoles = ["admin", "cashier", "kitchen", "queue", "customer_facing_display"] as const;
type OutletRole = (typeof outletRoles)[number];

function parsePayload(payload: Record<string, unknown>) {
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const role = payload.role;
  const password = typeof payload.password === "string" ? payload.password : "";
  if (!email.includes("@") || !outletRoles.includes(role as OutletRole)) {
    throw new ValidationError("Membership validation failed.", {
      ...(email.includes("@") ? {} : { email: "Enter a valid email." }),
      ...(outletRoles.includes(role as OutletRole) ? {} : { role: "Choose a valid outlet role." }),
    });
  }
  if (password && password.length < 12) {
    throw new ValidationError("Membership validation failed.", { password: "Password must contain at least 12 characters." });
  }
  return { name, email, role: role as OutletRole, password, isActive: payload.isActive !== false };
}

export async function listOutletMembers(context?: TenantContext) {
  const tenant = context ?? await requireTenantContext(["owner", "admin"]);
  return prisma.outletMembership.findMany({
    where: { organizationId: tenant.organizationId, outletId: tenant.outletId },
    include: { user: true },
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
    take: 100,
  });
}

export async function saveOutletMember(payload: Record<string, unknown>, actorId?: string, expectedUserId?: string) {
  const tenant = await requireTenantContext(["owner", "admin"]);
  const input = parsePayload(payload);
  return saveOutletMemberInTenant(tenant, input, actorId ?? tenant.userId, expectedUserId);
}

async function saveOutletMemberInTenant(
  tenant: TenantContext,
  input: ReturnType<typeof parsePayload>,
  actorId: string,
  expectedUserId?: string,
) {
  return withTenantTransaction(tenant, async (tx) => {
    let user = expectedUserId
      ? await tx.user.findUnique({ where: { id: expectedUserId } })
      : await tx.user.findUnique({ where: { email: input.email } });
    if (expectedUserId && (!user || user.email !== input.email)) throw new NotFoundError("Outlet membership was not found.");
    if (!user) {
      if (!input.name || input.password.length < 12) {
        throw new ValidationError("Membership validation failed.", {
          name: input.name ? "" : "Name is required for a new user.",
          password: "A password of at least 12 characters is required for a new user.",
        });
      }
      user = await tx.user.create({
        data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password), role: input.role as UserRole },
      });
    }

    const existing = await tx.outletMembership.findUnique({
      where: { outletId_userId: { outletId: tenant.outletId, userId: user.id } },
    });
    const membership = await tx.outletMembership.upsert({
      where: { outletId_userId: { outletId: tenant.outletId, userId: user.id } },
      create: { organizationId: tenant.organizationId, outletId: tenant.outletId, userId: user.id, role: input.role, isActive: input.isActive },
      update: { role: input.role, isActive: input.isActive },
    });

    if (!input.isActive) {
      const ownerMembership = await tx.organizationMembership.findFirst({
        where: { organizationId: tenant.organizationId, userId: user.id, role: "owner", isActive: true },
      });
      if (ownerMembership) {
        const otherOwners = await tx.organizationMembership.count({
          where: { organizationId: tenant.organizationId, role: "owner", isActive: true, userId: { not: user.id } },
        });
        if (otherOwners === 0) throw new ForbiddenError("The organization must keep at least one active owner.");
        await tx.organizationMembership.update({ where: { id: ownerMembership.id }, data: { isActive: false } });
      }
    }

    await tx.activityLog.create({
      data: { userId: actorId, organizationId: tenant.organizationId, outletId: tenant.outletId,
        action: existing ? "membership.updated" : "membership.created", entityType: "outlet_membership", entityId: membership.id,
        metadata: { memberUserId: user.id, role: membership.role, isActive: membership.isActive } },
    });
    return { ...membership, user: { id: user.id, name: user.name, email: user.email, lastLoginAt: user.lastLoginAt } };
  });
}

export async function deactivateOutletMember(userId: string, actorId?: string) {
  const tenant = await requireTenantContext(["owner", "admin"]);
  return withTenantTransaction(tenant, async (tx) => {
    const membership = await tx.outletMembership.findFirst({
      where: { userId, organizationId: tenant.organizationId, outletId: tenant.outletId, isActive: true },
    });
    if (!membership) throw new NotFoundError("Outlet membership was not found.");
    const ownerMembership = await tx.organizationMembership.findFirst({
      where: { userId, organizationId: tenant.organizationId, role: "owner", isActive: true },
    });
    if (ownerMembership) {
      const activeOwners = await tx.organizationMembership.count({ where: { organizationId: tenant.organizationId, role: "owner", isActive: true } });
      if (activeOwners <= 1) throw new ForbiddenError("The organization must keep at least one active owner.");
      await tx.organizationMembership.update({ where: { id: ownerMembership.id }, data: { isActive: false } });
    }
    await tx.outletMembership.update({ where: { id: membership.id }, data: { isActive: false } });
    await tx.activityLog.create({ data: { userId: actorId ?? tenant.userId, organizationId: tenant.organizationId, outletId: tenant.outletId,
      action: "membership.deactivated", entityType: "outlet_membership", entityId: membership.id, metadata: { memberUserId: userId } } });
    return { ...membership, isActive: false };
  });
}
