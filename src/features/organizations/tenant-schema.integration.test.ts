import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.TENANT_INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration("tenant schema constraints (PostgreSQL)", () => {
  const prisma = new PrismaClient(
    databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined,
  );
  const suffix = randomUUID();
  const organizationIds: string[] = [];
  const outletIds: string[] = [];
  const userIds: string[] = [];
  let categoryId: string | undefined;
  let productId: string | undefined;
  let ingredientId: string | undefined;

  afterAll(async () => {
    if (outletIds.length) await prisma.outletMembership.deleteMany({ where: { outletId: { in: outletIds } } });
    if (organizationIds.length) await prisma.organizationMembership.deleteMany({ where: { organizationId: { in: organizationIds } } });
    if (outletIds.length) await prisma.outletIngredientStock.deleteMany({ where: { outletId: { in: outletIds } } });
    if (outletIds.length) await prisma.outletProduct.deleteMany({ where: { outletId: { in: outletIds } } });
    if (productId) await prisma.product.deleteMany({ where: { id: productId } });
    if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId } });
    if (ingredientId) await prisma.ingredient.deleteMany({ where: { id: ingredientId } });
    if (outletIds.length) await prisma.outlet.deleteMany({ where: { id: { in: outletIds } } });
    if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (organizationIds.length) await prisma.organization.deleteMany({ where: { id: { in: organizationIds } } });
    await prisma.$disconnect();
  });

  it("enforces tenant uniqueness and outlet consistency in PostgreSQL", async () => {
    expect(new URL(databaseUrl!).pathname).toMatch(/_test$/);
    const organizationA = await prisma.organization.create({
      data: { name: "Tenant Test A", slug: `tenant-test-a-${suffix}` },
    });
    const organizationB = await prisma.organization.create({
      data: { name: "Tenant Test B", slug: `tenant-test-b-${suffix}` },
    });
    organizationIds.push(organizationA.id, organizationB.id);

    await expect(prisma.organization.create({
      data: { name: "Duplicate Organization", slug: organizationA.slug },
    })).rejects.toMatchObject({ code: "P2002" });

    const outletA = await prisma.outlet.create({
      data: { organizationId: organizationA.id, name: "Main A", slug: "main" },
    });
    const outletB = await prisma.outlet.create({
      data: { organizationId: organizationB.id, name: "Main B", slug: "main" },
    });
    outletIds.push(outletA.id, outletB.id);

    await expect(prisma.outlet.create({
      data: { organizationId: organizationA.id, name: "Duplicate Outlet", slug: "main" },
    })).rejects.toMatchObject({ code: "P2002" });

    const users = await prisma.user.createManyAndReturn({
      data: [
        { name: "Tenant Test User A", email: `tenant-test-a-${suffix}@example.test`, passwordHash: "fixture-hash", role: "admin" },
        { name: "Tenant Test User B", email: `tenant-test-b-${suffix}@example.test`, passwordHash: "fixture-hash", role: "admin" },
      ],
      select: { id: true },
    });
    userIds.push(...users.map((user) => user.id));

    await prisma.organizationMembership.create({
      data: { organizationId: organizationA.id, userId: users[0].id, role: "owner" },
    });
    await expect(prisma.organizationMembership.create({
      data: { organizationId: organizationA.id, userId: users[0].id, role: "admin" },
    })).rejects.toMatchObject({ code: "P2002" });

    await prisma.outletMembership.create({
      data: { organizationId: organizationA.id, outletId: outletA.id, userId: users[0].id, role: "admin" },
    });
    await expect(prisma.outletMembership.create({
      data: { organizationId: organizationA.id, outletId: outletA.id, userId: users[0].id, role: "cashier" },
    })).rejects.toMatchObject({ code: "P2002" });
    await expect(prisma.outletMembership.create({
      data: { organizationId: organizationB.id, outletId: outletA.id, userId: users[1].id, role: "cashier" },
    })).rejects.toMatchObject({ code: "P2003" });

    const category = await prisma.category.create({
      data: { organizationId: organizationA.id, name: "Tenant Test", slug: `tenant-test-${suffix}` },
    });
    categoryId = category.id;
    const product = await prisma.product.create({
      data: { organizationId: organizationA.id, categoryId: category.id, name: "Tenant Test Product", sku: `tenant-test-${suffix}`, price: "10.00" },
    });
    productId = product.id;
    const ingredient = await prisma.ingredient.create({
      data: { organizationId: organizationA.id, name: "Tenant Test Ingredient", sku: `tenant-test-${suffix}`, unit: "g" },
    });
    ingredientId = ingredient.id;

    await prisma.outletProduct.create({ data: { outletId: outletA.id, productId: product.id } });
    await expect(prisma.outletProduct.create({
      data: { outletId: outletA.id, productId: product.id },
    })).rejects.toMatchObject({ code: "P2002" });

    await prisma.outletIngredientStock.create({ data: { outletId: outletA.id, ingredientId: ingredient.id } });
    await expect(prisma.outletIngredientStock.create({
      data: { outletId: outletA.id, ingredientId: ingredient.id },
    })).rejects.toMatchObject({ code: "P2002" });
  });
});
