import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/api-response";
import { requireTenantContext } from "@/features/auth/services/session-service";
import type { TenantContext } from "@/features/auth/types";
import { withTenantTransaction } from "@/lib/tenant-prisma";
import { prisma } from "@/lib/prisma";

function validateSlug(value: unknown, field: string) {
  const slug = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new ValidationError("Organization settings are invalid.", { [field]: "Use lowercase letters, numbers, and single hyphens." });
  }
  return slug;
}

function validateTimeZone(value: unknown) {
  const timeZone = typeof value === "string" && value.trim() ? value.trim() : "Asia/Jakarta";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    throw new ValidationError("Outlet settings are invalid.", { timeZone: "Use a valid IANA time zone." });
  }
  return timeZone;
}

export async function getCurrentOrganization(context?: TenantContext) {
  const tenant = context ?? await requireTenantContext(["owner", "admin"]);
  const organization = await prisma.organization.findUnique({
    where: { id: tenant.organizationId },
    select: { id: true, name: true, slug: true, isActive: true, createdAt: true, updatedAt: true },
  });
  if (!organization) throw new NotFoundError("Organization was not found.");
  return organization;
}

export async function updateCurrentOrganization(payload: Record<string, unknown>) {
  const tenant = await requireTenantContext(["owner"]);
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (!name) throw new ValidationError("Organization settings are invalid.", { name: "Organization name is required." });
  const slug = validateSlug(payload.slug, "slug");

  return withTenantTransaction(tenant, async (tx) => {
    const organization = await tx.organization.update({
      where: { id: tenant.organizationId },
      data: { name, slug },
      select: { id: true, name: true, slug: true, isActive: true, createdAt: true, updatedAt: true },
    });
    await tx.activityLog.create({ data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId,
      outletId: tenant.outletId,
      action: "organization.updated",
      entityType: "organization",
      entityId: organization.id,
      metadata: { name, slug },
    } });
    return organization;
  });
}

export async function listOrganizationOutlets(context?: TenantContext) {
  const tenant = context ?? await requireTenantContext(["owner", "admin"]);
  return prisma.outlet.findMany({
    where: {
      organizationId: tenant.organizationId,
      ...(tenant.role === "owner" ? {} : { id: tenant.outletId }),
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }, { id: "asc" }],
    select: { id: true, name: true, slug: true, timeZone: true, isActive: true, createdAt: true, updatedAt: true },
  });
}

export async function createOrganizationOutlet(payload: Record<string, unknown>) {
  const tenant = await requireTenantContext(["owner"]);
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (!name) throw new ValidationError("Outlet settings are invalid.", { name: "Outlet name is required." });
  const slug = validateSlug(payload.slug, "slug");
  const timeZone = validateTimeZone(payload.timeZone);

  return withTenantTransaction(tenant, async (tx) => {
    const outlet = await tx.outlet.create({
      data: { organizationId: tenant.organizationId, name, slug, timeZone },
      select: { id: true, name: true, slug: true, timeZone: true, isActive: true, createdAt: true, updatedAt: true },
    });
    await tx.appSetting.create({ data: { organizationId: tenant.organizationId, outletId: outlet.id, storeName: name, timeZone } });
    await tx.activityLog.create({ data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId,
      outletId: tenant.outletId,
      action: "outlet.created",
      entityType: "outlet",
      entityId: outlet.id,
      metadata: { name, slug },
    } });
    return outlet;
  });
}

export async function updateOrganizationOutlet(id: string, payload: Record<string, unknown>) {
  const tenant = await requireTenantContext(["owner", "admin"]);
  const isOwner = tenant.role === "owner";
  if (!isOwner && (id !== tenant.outletId || "slug" in payload || "isActive" in payload)) {
    throw new NotFoundError("Outlet was not found.");
  }
  const data: { name?: string; slug?: string; timeZone?: string; isActive?: boolean } = {};
  if ("name" in payload) {
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    if (!name) throw new ValidationError("Outlet settings are invalid.", { name: "Outlet name is required." });
    data.name = name;
  }
  if ("slug" in payload) data.slug = validateSlug(payload.slug, "slug");
  if ("timeZone" in payload) data.timeZone = validateTimeZone(payload.timeZone);
  if ("isActive" in payload) {
    if (typeof payload.isActive !== "boolean") throw new ValidationError("Outlet settings are invalid.", { isActive: "Choose an active state." });
    data.isActive = payload.isActive;
  }
  if (Object.keys(data).length === 0) throw new ValidationError("Outlet settings are invalid.", { outlet: "Provide at least one change." });

  return withTenantTransaction(tenant, async (tx) => {
    const current = await tx.outlet.findFirst({ where: { id, organizationId: tenant.organizationId } });
    if (!current) throw new NotFoundError("Outlet was not found.");
    if (data.isActive === false && current.isActive) {
      const activeCount = await tx.outlet.count({ where: { organizationId: tenant.organizationId, isActive: true } });
      if (activeCount <= 1) throw new ForbiddenError("An organization must keep at least one active outlet.");
    }

    const outlet = await tx.outlet.update({
      where: { id: current.id },
      data,
      select: { id: true, name: true, slug: true, timeZone: true, isActive: true, createdAt: true, updatedAt: true },
    });
    if (data.name || data.timeZone) {
      await tx.appSetting.updateMany({
        where: { organizationId: tenant.organizationId, outletId: outlet.id },
        data: { ...(data.name ? { storeName: data.name } : {}), ...(data.timeZone ? { timeZone: data.timeZone } : {}) },
      });
    }
    await tx.activityLog.create({ data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId,
      outletId: tenant.outletId,
      action: "outlet.updated",
      entityType: "outlet",
      entityId: outlet.id,
      metadata: {
        name: data.name ?? null,
        slug: data.slug ?? null,
        timeZone: data.timeZone ?? null,
        isActive: data.isActive ?? null,
      },
    } });
    return outlet;
  });
}
