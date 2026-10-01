import type { OrganizationRole, OutletRole, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AccessibleOutlet, TenantContext, TenantContextResolution } from "../types";

type TenantMembershipReader = Pick<PrismaClient, "organizationMembership" | "outletMembership">;

export interface OrganizationMembershipDTO {
  organizationId: string;
  role: OrganizationRole;
  isActive: boolean;
  organization: {
    id: string;
    name: string;
    isActive: boolean;
    outlets: Array<{ id: string; name: string; isActive: boolean }>;
  };
}

export interface OutletMembershipDTO {
  organizationId: string;
  outletId: string;
  role: OutletRole;
  isActive: boolean;
  outlet: {
    id: string;
    name: string;
    isActive: boolean;
    organization: { id: string; name: string; isActive: boolean };
  };
}

export interface TenantMembershipDTO {
  organizationMemberships: OrganizationMembershipDTO[];
  outletMemberships: OutletMembershipDTO[];
}

export interface TenantSelection {
  organizationId?: string | null;
  outletId?: string | null;
}

export async function getTenantMembershipsForUser(
  userId: string,
  client: TenantMembershipReader = prisma,
): Promise<TenantMembershipDTO> {
  const [organizationMemberships, outletMemberships] = await Promise.all([
    client.organizationMembership.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            outlets: { orderBy: [{ name: "asc" }, { id: "asc" }] },
          },
        },
      },
    }),
    client.outletMembership.findMany({
      where: { userId },
      include: {
        outlet: { include: { organization: true } },
      },
    }),
  ]);

  return { organizationMemberships, outletMemberships } as TenantMembershipDTO;
}

export function resolveTenantContext(
  userId: string,
  memberships: TenantMembershipDTO,
  selection: TenantSelection = {},
): TenantContextResolution {
  const accessible = new Map<string, AccessibleOutlet>();

  for (const membership of memberships.organizationMemberships) {
    if (!membership.isActive || !membership.organization.isActive || membership.role !== "owner") continue;
    for (const outlet of membership.organization.outlets) {
      if (!outlet.isActive) continue;
      const key = `${membership.organizationId}:${outlet.id}`;
      accessible.set(key, {
        organizationId: membership.organizationId,
        organizationName: membership.organization.name,
        outletId: outlet.id,
        outletName: outlet.name,
        role: "owner",
      });
    }
  }

  for (const membership of memberships.outletMemberships) {
    if (!membership.isActive || !membership.outlet.isActive || !membership.outlet.organization.isActive) continue;
    const key = `${membership.organizationId}:${membership.outletId}`;
    const current = accessible.get(key);
    accessible.set(key, {
      organizationId: membership.organizationId,
      organizationName: membership.outlet.organization.name,
      outletId: membership.outletId,
      outletName: membership.outlet.name,
      role: current?.role === "owner" ? "owner" : membership.role,
    });
  }

  const outlets = [...accessible.values()].sort((left, right) =>
    left.organizationName.localeCompare(right.organizationName) ||
    left.outletName.localeCompare(right.outletName) ||
    left.organizationId.localeCompare(right.organizationId) ||
    left.outletId.localeCompare(right.outletId),
  );

  if (selection.organizationId && selection.outletId) {
    const selected = outlets.find((outlet) =>
      outlet.organizationId === selection.organizationId && outlet.outletId === selection.outletId,
    );
    if (selected) {
      return {
        status: "ready",
        context: { userId, organizationId: selected.organizationId, outletId: selected.outletId, role: selected.role },
        outlets,
      };
    }
  }

  if (outlets.length === 1) {
    const onlyOutlet = outlets[0];
    return {
      status: "ready",
      context: { userId, organizationId: onlyOutlet.organizationId, outletId: onlyOutlet.outletId, role: onlyOutlet.role },
      outlets,
    };
  }

  if (outlets.length > 1) return { status: "outlet_required", outlets };
  return { status: "no_access", outlets: [] };
}

export async function getTenantContextForUser(
  userId: string,
  selection?: TenantSelection,
  client: TenantMembershipReader = prisma,
): Promise<TenantContextResolution> {
  const memberships = await getTenantMembershipsForUser(userId, client);
  return resolveTenantContext(userId, memberships, selection);
}

export async function getAccessibleOutletForUser(
  userId: string,
  outletId: string,
  client: TenantMembershipReader = prisma,
): Promise<TenantContext | null> {
  const result = await getTenantContextForUser(userId, {}, client);
  if (result.status === "no_access") return null;
  const outlet = result.outlets.find((candidate) => candidate.outletId === outletId);
  if (!outlet) return null;
  return {
    userId,
    organizationId: outlet.organizationId,
    outletId: outlet.outletId,
    role: outlet.role,
  };
}
