import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import type { TenantContext } from "@/features/auth/types";
import { setDatabaseTenantContext } from "./tenant-prisma";

const databaseUrl = process.env.TENANT_RLS_TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;

integrationDescribe("PostgreSQL tenant row-level security", () => {
  const suffix = randomUUID();
  let prisma: PrismaClient;
  let organizationAId: string;
  let organizationBId: string;
  let productAId: string;
  let productBId: string;
  let categoryAId: string;
  let categoryBId: string;
  let userAId: string;
  let userBId: string;
  let contextA: TenantContext;
  let contextB: TenantContext;

  async function asRuntime<T>(
    callback: (transaction: Prisma.TransactionClient) => Promise<T>,
    context?: Partial<TenantContext>,
  ) {
    return prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SET LOCAL ROLE pos_runtime`;
      if (context) await setDatabaseTenantContext(transaction, context);
      return callback(transaction);
    });
  }

  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    url.searchParams.set("connection_limit", "4");
    prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });

    const [organizationA, organizationB] = await Promise.all([
      prisma.organization.create({ data: { name: `RLS A ${suffix}`, slug: `rls-a-${suffix}` } }),
      prisma.organization.create({ data: { name: `RLS B ${suffix}`, slug: `rls-b-${suffix}` } }),
    ]);
    organizationAId = organizationA.id;
    organizationBId = organizationB.id;
    const [outletA, outletB] = await Promise.all([
      prisma.outlet.create({ data: { organizationId: organizationAId, name: "RLS outlet A", slug: `a-${suffix}` } }),
      prisma.outlet.create({ data: { organizationId: organizationBId, name: "RLS outlet B", slug: `b-${suffix}` } }),
    ]);
    const [categoryA, categoryB] = await Promise.all([
      prisma.category.create({ data: { organizationId: organizationAId, name: "RLS A", slug: `rls-a-${suffix}` } }),
      prisma.category.create({ data: { organizationId: organizationBId, name: "RLS B", slug: `rls-b-${suffix}` } }),
    ]);
    categoryAId = categoryA.id;
    categoryBId = categoryB.id;
    const [userA, userB] = await Promise.all([
      prisma.user.create({ data: { name: "RLS user A", email: `rls-a-${suffix}@example.test`, passwordHash: "fixture" } }),
      prisma.user.create({ data: { name: "RLS user B", email: `rls-b-${suffix}@example.test`, passwordHash: "fixture" } }),
    ]);
    userAId = userA.id;
    userBId = userB.id;
    await Promise.all([
      prisma.organizationMembership.create({ data: { organizationId: organizationAId, userId: userAId, role: "owner" } }),
      prisma.organizationMembership.create({ data: { organizationId: organizationBId, userId: userBId, role: "owner" } }),
      prisma.outletMembership.create({ data: { organizationId: organizationAId, outletId: outletA.id, userId: userAId, role: "admin" } }),
      prisma.outletMembership.create({ data: { organizationId: organizationBId, outletId: outletB.id, userId: userBId, role: "admin" } }),
    ]);
    const [productA, productB] = await Promise.all([
      prisma.product.create({ data: { organizationId: organizationAId, categoryId: categoryAId, name: "Product A", price: "100", outletProducts: { create: { outletId: outletA.id } } } }),
      prisma.product.create({ data: { organizationId: organizationBId, categoryId: categoryBId, name: "Product B", price: "100", outletProducts: { create: { outletId: outletB.id } } } }),
    ]);
    productAId = productA.id;
    productBId = productB.id;
    contextA = { userId: userAId, organizationId: organizationAId, outletId: outletA.id, role: "admin" };
    contextB = { userId: userBId, organizationId: organizationBId, outletId: outletB.id, role: "admin" };
  });

  afterAll(async () => {
    if (organizationAId || organizationBId) {
      const organizationIds = [organizationAId, organizationBId].filter(Boolean);
      await prisma.product.deleteMany({ where: { organizationId: { in: organizationIds } } });
      await prisma.category.deleteMany({ where: { organizationId: { in: organizationIds } } });
      await prisma.organization.deleteMany({ where: { id: { in: [organizationAId, organizationBId].filter(Boolean) } } });
      await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId].filter(Boolean) } } });
    }
    await prisma?.$disconnect();
  });

  it("hides foreign IDs and blocks foreign inserts, updates, and deletes", async () => {
    await asRuntime(async (tx) => {
      expect(await tx.product.findMany()).toHaveLength(1);
      expect(await tx.product.findUnique({ where: { id: productBId } })).toBeNull();
      expect(await tx.product.updateMany({ where: { id: productBId }, data: { name: "tampered" } })).toMatchObject({ count: 0 });
      expect(await tx.product.deleteMany({ where: { id: productBId } })).toMatchObject({ count: 0 });

      await expect(tx.product.create({
        data: { organizationId: organizationBId, categoryId: categoryBId, name: "Cross tenant", price: "1" },
      })).rejects.toThrow("42501");
    }, contextA);
  });

  it("denies access with no tenant settings and rejects inserts", async () => {
    await asRuntime(async (tx) => {
      expect(await tx.product.findMany()).toHaveLength(0);
      await expect(tx.product.create({
        data: { organizationId: organizationAId, categoryId: categoryAId, name: "No context", price: "1" },
      })).rejects.toThrow("42501");
    });
  });

  it("lets auth resolution read only the user’s memberships before outlet context is active", async () => {
    await asRuntime(async (tx) => {
      const [memberships, organizations, outlets] = await Promise.all([
        tx.organizationMembership.findMany({ where: { userId: userAId }, include: { organization: { include: { outlets: true } } } }),
        tx.organization.findMany(),
        tx.outlet.findMany(),
      ]);
      expect(memberships).toHaveLength(1);
      expect(memberships[0].organization.id).toBe(organizationAId);
      expect(organizations.map(({ id }) => id)).toEqual([organizationAId]);
      expect(outlets.map(({ organizationId }) => organizationId)).toEqual([organizationAId]);
    }, { userId: userAId });
  });

  it("clears context after rollback and never leaks settings through pooled reuse", async () => {
    await expect(prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE pos_runtime`;
      await setDatabaseTenantContext(tx, contextA);
      expect(await tx.product.count()).toBe(1);
      throw new Error("rollback context");
    })).rejects.toThrow("rollback context");

    await asRuntime(async (tx) => expect(await tx.product.count()).toBe(0));
    await asRuntime(async (tx) => expect(await tx.product.count()).toBe(1), contextA);
    await asRuntime(async (tx) => expect(await tx.product.count()).toBe(1), contextB);
    await asRuntime(async (tx) => expect(await tx.product.count()).toBe(0));
  });

  it("isolates concurrent transactions for organizations on the shared pool", async () => {
    for (let iteration = 0; iteration < 5; iteration += 1) {
      const [rowsA, rowsB] = await Promise.all([
        asRuntime((tx) => tx.product.findMany({ select: { id: true } }), contextA),
        asRuntime((tx) => tx.product.findMany({ select: { id: true } }), contextB),
      ]);
      expect(rowsA.map(({ id }) => id)).toEqual([productAId]);
      expect(rowsB.map(({ id }) => id)).toEqual([productBId]);
    }
  });
});
