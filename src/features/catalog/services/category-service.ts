import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/api-response";
import { toBoolean, toInteger } from "@/lib/number";
import type { User } from "@/features/auth/types";
import {
  createCategory,
  findCategoryById,
  listCategories,
  updateCategory,
} from "../repositories/category-repository";
import { mapCategory } from "./catalog-mappers";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function parseCategoryPayload(payload: Record<string, unknown>) {
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const slugSource = typeof payload.slug === "string" ? payload.slug : name;
  const slug = slugify(slugSource);
  const sortOrder = toInteger(payload.sortOrder, 0);
  const isActive = toBoolean(payload.isActive, true);

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Category name is required.";
  if (!slug) fieldErrors.slug = "Slug is required.";

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError("Category validation failed.", fieldErrors);
  }

  return { name, slug, sortOrder, isActive };
}

export async function getCategoryList(includeInactive: boolean) {
  const categories = await listCategories(includeInactive);
  return categories.map(mapCategory);
}

export async function createCategoryFromPayload(
  payload: Record<string, unknown>,
  actor: User,
) {
  const data = parseCategoryPayload(payload);
  const category = await createCategory(data);

  await prisma.activityLog.create({
    data: {
      userId: actor.id,
      action: "category.created",
      entityType: "category",
      entityId: category.id,
    },
  });

  return mapCategory({ ...category, _count: { products: 0 } });
}

export async function updateCategoryFromPayload(
  id: string,
  payload: Record<string, unknown>,
  actor: User,
) {
  const existing = await findCategoryById(id);
  if (!existing) {
    throw new NotFoundError("Category was not found.");
  }

  const data = parseCategoryPayload(payload);
  const category = await updateCategory(id, data);

  await prisma.activityLog.create({
    data: {
      userId: actor.id,
      action: "category.updated",
      entityType: "category",
      entityId: category.id,
    },
  });

  return mapCategory({ ...category, _count: { products: 0 } });
}
