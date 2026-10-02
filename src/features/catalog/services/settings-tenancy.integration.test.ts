import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.TENANT_TRANSACTION_TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;

integrationDescribe("outlet settings tenancy (PostgreSQL)", () => {
  const suffix = randomUUID();
  let prisma: PrismaClient;
  let getSettings: typeof import("./settings-service")["getAppSettings"];
  let organizationId: string;
  let outletAId: string;
  let outletBId: string;
  let userId: string;

  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    url.searchParams.set("connection_limit", "1");
    process.env.DATABASE_URL = url.toString();
    const shared = await import("@/lib/prisma");
    prisma = shared.prisma;
    const service = await import("./settings-service");
    getSettings = service.getAppSettings;
    const organization = await prisma.organization.create({
      data: { name: `Settings ${suffix}`, slug: `settings-${suffix}` },
    });
    organizationId = organization.id;
    const [outletA, outletB] = await Promise.all([
      prisma.outlet.create({ data: { organizationId, name: "Settings A", slug: `a-${suffix}` } }),
      prisma.outlet.create({ data: { organizationId, name: "Settings B", slug: `b-${suffix}` } }),
    ]);
    outletAId = outletA.id;
    outletBId = outletB.id;
    const user = await prisma.user.create({
      data: { name: "Settings Test", email: `settings-${suffix}@example.test`, passwordHash: "fixture-hash" },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (organizationId) {
      await prisma.appSetting.deleteMany({ where: { organizationId } });
      await prisma.organization.delete({ where: { id: organizationId } });
    }
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await prisma?.$disconnect();
  });

  it("keeps settings per outlet and serializes first-read creation", async () => {
    const contextA = { userId, organizationId, outletId: outletAId, role: "owner" as const };
    const contextB = { userId, organizationId, outletId: outletBId, role: "owner" as const };
    await Promise.all(Array.from({ length: 4 }, () => getSettings(contextA)));
    await getSettings(contextB);

    const rows = await prisma.appSetting.findMany({ where: { organizationId } });
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map(({ outletId }) => outletId))).toEqual(new Set([outletAId, outletBId]));
  });
});
