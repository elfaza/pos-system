import { Prisma } from "@prisma/client";
import { NotFoundError, ValidationError } from "@/lib/api-response";
import type { User } from "@/features/auth/types";
import { requireTenantContext } from "@/features/auth/services/session-service";
import { withTenantTransaction } from "@/lib/tenant-prisma";
import type { DiningTableRecord } from "../types";

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function mapTable(table: {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}): DiningTableRecord {
  return {
    id: table.id,
    name: table.name,
    sortOrder: table.sortOrder,
    isActive: table.isActive,
  };
}

function parseTablePayload(payload: Record<string, unknown>) {
  const name = optionalString(payload.name) ?? "";
  const sortOrder = Number(payload.sortOrder ?? 0);
  const fieldErrors: Record<string, string> = {};

  if (!name) fieldErrors.name = "Table name is required.";
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    fieldErrors.sortOrder = "Sort order must be 0 or greater.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError("Table validation failed.", fieldErrors);
  }

  return {
    name,
    sortOrder,
    isActive: payload.isActive !== false,
  };
}

export async function getTables(includeInactive = false) {
  const tenant = await requireTenantContext(["owner", "admin", "cashier"]);
  const tables = await withTenantTransaction(tenant, (tx) => tx.diningTable.findMany({
    where: { organizationId: tenant.organizationId, outletId: tenant.outletId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  }));
  return tables.map(mapTable);
}

export async function createTableFromPayload(
  payload: Record<string, unknown>,
  actor: User,
) {
  const tenant = await requireTenantContext(["owner", "admin"]);
  try {
    const table = await withTenantTransaction(tenant, async (tx) => {
      const created = await tx.diningTable.create({
        data: { ...parseTablePayload(payload), organizationId: tenant.organizationId, outletId: tenant.outletId },
      });
      await tx.activityLog.create({
      data: {
        userId: actor.id,
        organizationId: tenant.organizationId,
        outletId: tenant.outletId,
        action: "table.created",
        entityType: "dining_table",
        entityId: created.id,
      },
      });
      return created;
    });
    return mapTable(table);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ValidationError("Table validation failed.", {
        name: "Table name is already used.",
      });
    }
    throw error;
  }
}

export async function updateTableFromPayload(
  id: string,
  payload: Record<string, unknown>,
  actor: User,
) {
  const tenant = await requireTenantContext(["owner", "admin"]);
  try {
    const table = await withTenantTransaction(tenant, async (tx) => {
      const updated = await tx.diningTable.update({
        where: { id, organizationId: tenant.organizationId, outletId: tenant.outletId },
        data: parseTablePayload(payload),
      });
      await tx.activityLog.create({
      data: {
        userId: actor.id,
        organizationId: tenant.organizationId,
        outletId: tenant.outletId,
        action: "table.updated",
        entityType: "dining_table",
        entityId: updated.id,
      },
      });
      return updated;
    });
    return mapTable(table);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundError("Table was not found.");
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ValidationError("Table validation failed.", {
        name: "Table name is already used.",
      });
    }
    throw error;
  }
}
