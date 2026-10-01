import type { Prisma } from "@prisma/client";

export const categoryListLimit = 200;

export function listCategories(
  client: Prisma.TransactionClient,
  organizationId: string,
  includeInactive: boolean,
) {
  return client.category.findMany({
    where: {
      organizationId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    include: {
      _count: {
        select: { products: { where: { organizationId } } },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: categoryListLimit,
  });
}

export function findCategoryById(
  client: Prisma.TransactionClient,
  organizationId: string,
  id: string,
) {
  return client.category.findFirst({ where: { id, organizationId } });
}

export function createCategory(
  client: Prisma.TransactionClient,
  organizationId: string,
  data: {
    name: string;
    slug: string;
    sortOrder: number;
    isActive: boolean;
  },
) {
  return client.category.create({ data: { ...data, organizationId } });
}

export async function updateCategory(
  client: Prisma.TransactionClient,
  organizationId: string,
  id: string,
  data: {
    name: string;
    slug: string;
    sortOrder: number;
    isActive: boolean;
  },
) {
  const result = await client.category.updateMany({
    where: { id, organizationId },
    data,
  });
  if (result.count === 0) return null;
  return client.category.findFirst({ where: { id, organizationId } });
}
