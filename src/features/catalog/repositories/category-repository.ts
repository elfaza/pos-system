import { prisma } from "@/lib/prisma";

export function listCategories(includeInactive: boolean) {
  return prisma.category.findMany({
    where: includeInactive ? undefined : { isActive: true },
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export function findCategoryById(id: string) {
  return prisma.category.findUnique({ where: { id } });
}

export function createCategory(data: {
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}) {
  return prisma.category.create({ data });
}

export function updateCategory(
  id: string,
  data: {
    name: string;
    slug: string;
    sortOrder: number;
    isActive: boolean;
  },
) {
  return prisma.category.update({ where: { id }, data });
}
