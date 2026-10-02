import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.TENANT_TRANSACTION_TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;

integrationDescribe("outlet inventory tenancy (PostgreSQL)", () => {
  const suffix = randomUUID();
  let prisma: PrismaClient;
  let repository: typeof import("../repositories/inventory-repository");
  let organizationId: string;
  let foreignOrganizationId: string;
  let outletAId: string;
  let outletBId: string;
  let foreignOutletId: string;
  let ingredientId: string;
  let userId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    const url = new URL(databaseUrl!);
    url.searchParams.set("connection_limit", "1");
    process.env.DATABASE_URL = url.toString();
    const { prisma: sharedPrisma } = await import("@/lib/prisma");
    prisma = sharedPrisma;
    repository = await import("../repositories/inventory-repository");

    const organization = await prisma.organization.create({ data: { name: `Inventory A ${suffix}`, slug: `inventory-a-${suffix}` } });
    const foreignOrganization = await prisma.organization.create({ data: { name: `Inventory B ${suffix}`, slug: `inventory-b-${suffix}` } });
    organizationId = organization.id;
    foreignOrganizationId = foreignOrganization.id;
    const outlets = await Promise.all([
      prisma.outlet.create({ data: { organizationId, name: "Outlet A", slug: `a-${suffix}` } }),
      prisma.outlet.create({ data: { organizationId, name: "Outlet B", slug: `b-${suffix}` } }),
      prisma.outlet.create({ data: { organizationId: foreignOrganizationId, name: "Foreign Outlet", slug: `foreign-${suffix}` } }),
    ]);
    [outletAId, outletBId, foreignOutletId] = outlets.map(({ id }) => id);
    const user = await prisma.user.create({ data: {
      name: "Inventory test", email: `inventory-${suffix}@example.test`, passwordHash: "fixture-hash",
    } });
    userId = user.id;
    const ingredient = await prisma.ingredient.create({
      data: { organizationId, name: `Beans ${suffix}`, sku: `beans-${suffix}`, unit: "g" },
    });
    ingredientId = ingredient.id;
    await prisma.outletIngredientStock.createMany({ data: [
      { outletId: outletAId, ingredientId, currentStock: "10", lowStockThreshold: "2" },
      { outletId: outletBId, ingredientId, currentStock: "40", lowStockThreshold: "5" },
    ] });
  });

  afterAll(async () => {
    if (organizationId || foreignOrganizationId) {
      await prisma.activityLog.deleteMany({ where: { organizationId: { in: [organizationId, foreignOrganizationId].filter(Boolean) } } });
    }
    if (ingredientId) {
      await prisma.stockMovement.deleteMany({ where: { ingredientId } });
      await prisma.outletIngredientStock.deleteMany({ where: { ingredientId } });
      await prisma.ingredient.deleteMany({ where: { id: ingredientId } });
    }
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    if (outletAId || outletBId || foreignOutletId) {
      await prisma.outlet.deleteMany({ where: { id: { in: [outletAId, outletBId, foreignOutletId].filter(Boolean) } } });
    }
    if (organizationId || foreignOrganizationId) {
      await prisma.organization.deleteMany({ where: { id: { in: [organizationId, foreignOrganizationId].filter(Boolean) } } });
    }
    await prisma?.$disconnect();
  });

  it("keeps balances separate by outlet and rejects adjustment from another organization", async () => {
    const contextA = { userId, organizationId, outletId: outletAId, role: "owner" as const };
    const contextB = { userId, organizationId, outletId: outletBId, role: "owner" as const };
    const foreignContext = { userId, organizationId: foreignOrganizationId, outletId: foreignOutletId, role: "owner" as const };

    const result = await repository.adjustIngredientStock(contextA, {
      ingredientId, quantity: "3", direction: "increase", type: "adjustment", reason: "Count correction",
    });
    expect(result?.insufficient).toBe(false);
    if (!result || result.insufficient) return;
    expect(Number(result.ingredient.currentStock)).toBe(13);

    const [balanceA, balanceB] = await Promise.all([
      repository.findIngredientById(contextA, ingredientId),
      repository.findIngredientById(contextB, ingredientId),
    ]);
    expect(Number(balanceA?.currentStock)).toBe(13);
    expect(Number(balanceB?.currentStock)).toBe(40);

    await expect(repository.adjustIngredientStock(foreignContext, {
      ingredientId, quantity: "1", direction: "increase", type: "adjustment", reason: "Cross tenant attempt",
    })).resolves.toBeNull();
    const movements = await repository.listStockMovements(contextA, { ingredientId });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ organizationId, outletId: outletAId });
  });
});
