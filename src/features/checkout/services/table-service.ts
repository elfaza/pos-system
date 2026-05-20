import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/api-response";
import type { User } from "@/features/auth/types";
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
  const tables = await prisma.diningTable.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return tables.map(mapTable);
}

export async function createTableFromPayload(
  payload: Record<string, unknown>,
  actor: User,
) {
  try {
    const table = await prisma.diningTable.create({
      data: parseTablePayload(payload),
    });
    await prisma.activityLog.create({
      data: {
        userId: actor.id,
        action: "table.created",
        entityType: "dining_table",
        entityId: table.id,
      },
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
  try {
    const table = await prisma.diningTable.update({
      where: { id },
      data: parseTablePayload(payload),
    });
    await prisma.activityLog.create({
      data: {
        userId: actor.id,
        action: "table.updated",
        entityType: "dining_table",
        entityId: table.id,
      },
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
