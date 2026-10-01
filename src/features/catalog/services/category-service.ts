import { withTenantTransaction } from "@/lib/tenant-prisma";
import { NotFoundError, ValidationError } from "@/lib/api-response";
import { toBoolean, toInteger } from "@/lib/number";
import type { TenantContext } from "@/features/auth/types";
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

export async function getCategoryList(context: TenantContext, includeInactive: boolean) {
  const categories = await withTenantTransaction(context, (tx) =>
    listCategories(tx, context.organizationId, includeInactive),
  );
  return categories.map(mapCategory);
}

export async function createCategoryFromPayload(
  payload: Record<string, unknown>,
  context: TenantContext,
) {
  const data = parseCategoryPayload(payload);
  const category = await withTenantTransaction(context, async (tx) => {
    const created = await createCategory(tx, context.organizationId, data);
    await tx.activityLog.create({
      data: {
        userId: context.userId,
        organizationId: context.organizationId,
        outletId: context.outletId,
        action: "category.created",
        entityType: "category",
        entityId: created.id,
      },
    });
    return created;
  });

  return mapCategory({ ...category, _count: { products: 0 } });
}

export async function updateCategoryFromPayload(
  id: string,
  payload: Record<string, unknown>,
  context: TenantContext,
) {
  const data = parseCategoryPayload(payload);
  const category = await withTenantTransaction(context, async (tx) => {
    const existing = await findCategoryById(tx, context.organizationId, id);
    if (!existing) throw new NotFoundError("Category was not found.");
    const updated = await updateCategory(tx, context.organizationId, id, data);
    if (!updated) throw new NotFoundError("Category was not found.");
    await tx.activityLog.create({
      data: {
        userId: context.userId,
        organizationId: context.organizationId,
        outletId: context.outletId,
        action: "category.updated",
        entityType: "category",
        entityId: updated.id,
      },
    });
    return updated;
  });

  return mapCategory({ ...category, _count: { products: 0 } });
}
