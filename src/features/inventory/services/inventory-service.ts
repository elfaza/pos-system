import { NotFoundError, ValidationError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import {
  toBoolean,
  toDecimalString,
  toOptionalDecimalString,
} from "@/lib/number";
import type { User } from "@/features/auth/types";
import {
  adjustIngredientStock,
  countLowStockIngredients,
  createIngredient,
  findIngredientById,
  listIngredients,
  listStockMovements,
  updateIngredient,
} from "../repositories/inventory-repository";
import { mapIngredient, mapStockMovement } from "./inventory-mappers";

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseIngredientPayload(payload: Record<string, unknown>) {
  const name = optionalString(payload.name) ?? "";
  const unit = optionalString(payload.unit) ?? "";
  const currentStock = toDecimalString(payload.currentStock, "0");
  const lowStockThreshold = toOptionalDecimalString(payload.lowStockThreshold);
  const fieldErrors: Record<string, string> = {};

  if (!name) fieldErrors.name = "Ingredient name is required.";
  if (!unit) fieldErrors.unit = "Unit is required.";
  if (Number(currentStock) < 0) {
    fieldErrors.currentStock = "Current stock must be greater than or equal to 0.";
  }
  if (lowStockThreshold !== null && Number(lowStockThreshold) < 0) {
    fieldErrors.lowStockThreshold =
      "Low stock threshold must be greater than or equal to 0.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError("Ingredient validation failed.", fieldErrors);
  }

  return {
    name,
    sku: optionalString(payload.sku),
    unit,
    currentStock,
    lowStockThreshold,
    isActive: toBoolean(payload.isActive, true),
  };
}

function parseAdjustmentPayload(payload: Record<string, unknown>): {
  quantity: string;
  direction: "increase" | "decrease";
  reason: string;
  type: "adjustment" | "waste";
} {
  const quantity = toDecimalString(payload.quantity, "");
  const direction = payload.direction === "decrease" ? "decrease" : "increase";
  const reason = optionalString(payload.reason) ?? "";
  const type = payload.type === "waste" ? "waste" : "adjustment";
  const fieldErrors: Record<string, string> = {};

  if (quantity === "" || Number(quantity) <= 0) {
    fieldErrors.quantity = "Quantity must be greater than 0.";
  }
  if (!reason) {
    fieldErrors.reason = "Reason is required.";
  }
  if (type === "waste" && direction !== "decrease") {
    fieldErrors.direction = "Waste must decrease stock.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError("Stock adjustment validation failed.", fieldErrors);
  }

  return { quantity, direction, reason, type };
}

export async function getIngredientList(url: URL) {
  const activeParam = url.searchParams.get("active");
  const ingredients = await listIngredients({
    search: url.searchParams.get("search") ?? undefined,
    active:
      activeParam === "true" ? true : activeParam === "false" ? false : undefined,
    lowStockOnly: url.searchParams.get("lowStockOnly") === "true",
  });

  return ingredients.map(mapIngredient);
}

export async function getLowStockIngredientCount() {
  return countLowStockIngredients();
}

export async function createIngredientFromPayload(
  payload: Record<string, unknown>,
  actor: User,
) {
  const data = parseIngredientPayload(payload);
  const ingredient = await createIngredient(data);

  await prisma.activityLog.create({
    data: {
      userId: actor.id,
      action: "ingredient.created",
      entityType: "ingredient",
      entityId: ingredient.id,
    },
  });

  return mapIngredient(ingredient);
}

export async function updateIngredientFromPayload(
  id: string,
  payload: Record<string, unknown>,
  actor: User,
) {
  const existing = await findIngredientById(id);
  if (!existing) {
    throw new NotFoundError("Ingredient was not found.");
  }

  const data = parseIngredientPayload({
    ...payload,
    currentStock: existing.currentStock.toString(),
  });
  const ingredient = await updateIngredient(id, {
    name: data.name,
    sku: data.sku,
    unit: data.unit,
    lowStockThreshold: data.lowStockThreshold,
    isActive: data.isActive,
  });

  await prisma.activityLog.create({
    data: {
      userId: actor.id,
      action: "ingredient.updated",
      entityType: "ingredient",
      entityId: ingredient.id,
    },
  });

  return mapIngredient(ingredient);
}

export async function adjustIngredientFromPayload(
  id: string,
  payload: Record<string, unknown>,
  actor: User,
) {
  const data = parseAdjustmentPayload(payload);
  const result = await adjustIngredientStock({
    ingredientId: id,
    quantity: data.quantity,
    direction: data.type === "waste" ? "decrease" : data.direction,
    type: data.type,
    reason: data.reason,
    actorId: actor.id,
  });

  if (!result) {
    throw new NotFoundError("Ingredient was not found.");
  }
  if (result.insufficient) {
    throw new ValidationError("Stock cannot be reduced below zero.", {
      quantity: "Quantity exceeds current stock.",
    });
  }

  return mapIngredient(result.ingredient);
}

export async function getStockMovementList(url: URL) {
  const type = url.searchParams.get("type");
  const allowedTypes = [
    "sale_deduction",
    "adjustment",
    "waste",
    "refund_restore",
  ] as const;

  if (type && !allowedTypes.includes(type as (typeof allowedTypes)[number])) {
    throw new ValidationError("Stock movement type filter is invalid.", {
      type: "Use a valid movement type.",
    });
  }

  const movements = await listStockMovements({
    ingredientId: url.searchParams.get("ingredientId") ?? undefined,
    type: type as (typeof allowedTypes)[number] | undefined,
    dateFrom: url.searchParams.get("dateFrom")
      ? new Date(`${url.searchParams.get("dateFrom")}T00:00:00.000Z`)
      : undefined,
    dateTo: url.searchParams.get("dateTo")
      ? new Date(`${url.searchParams.get("dateTo")}T23:59:59.999Z`)
      : undefined,
  });

  return movements.map(mapStockMovement);
}
