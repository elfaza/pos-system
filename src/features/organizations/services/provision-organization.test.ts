import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { provisionOrganization, type ProvisionOrganizationInput } from "./provision-organization";

vi.mock("@/features/auth/utils/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-owner-password"),
}));

const databaseUrl = process.env.TENANT_TRANSACTION_TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;

function input(suffix: string, overrides: Partial<ProvisionOrganizationInput> = {}): ProvisionOrganizationInput {
  return {
    organizationName: `Provisioned ${suffix}`,
    organizationSlug: `provisioned-${suffix}`,
    outletName: "Main Outlet",
    outletSlug: "main",
    ownerName: "Owner User",
    ownerEmail: `owner-${suffix}@example.test`,
    ownerPassword: "a-long-development-password",
    seedCatalog: true,
    ...overrides,
  };
}

describe("organization provisioning validation", () => {
  it("validates required identifiers and owner password before starting a transaction", async () => {
    const transaction = vi.fn();
    await expect(provisionOrganization(input("bad", {
      organizationSlug: "Not A Slug",
      ownerEmail: "not-an-email",
      ownerPassword: "short",
    }), { $transaction: transaction })).rejects.toMatchObject({
      fieldErrors: expect.objectContaining({
        organizationSlug: expect.any(String),
        ownerEmail: expect.any(String),
        ownerPassword: expect.any(String),
      }),
    });
    expect(transaction).not.toHaveBeenCalled();
  });
});

integrationDescribe("organization provisioning (PostgreSQL)", () => {
  const suffix = randomUUID();
  const organizations: string[] = [];
  const ownerEmails: string[] = [];
  let prisma: PrismaClient;

  beforeAll(() => {
    const url = new URL(databaseUrl!);
    url.searchParams.set("connection_limit", "1");
    prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  });

  afterAll(async () => {
    const orgRows = await prisma.organization.findMany({ where: { slug: { in: organizations } }, select: { id: true } });
    const orgIds = orgRows.map(({ id }) => id);
    if (orgIds.length) {
      await prisma.expenseCategory.deleteMany({ where: { organizationId: { in: orgIds } } });
      await prisma.account.deleteMany({ where: { organizationId: { in: orgIds } } });
      await prisma.product.deleteMany({ where: { organizationId: { in: orgIds } } });
      await prisma.category.deleteMany({ where: { organizationId: { in: orgIds } } });
      await prisma.appSetting.deleteMany({ where: { organizationId: { in: orgIds } } });
      await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    }
    if (ownerEmails.length) await prisma.user.deleteMany({ where: { email: { in: ownerEmails } } });
    await prisma?.$disconnect();
  });

  it("creates organization, outlet, owner, memberships, settings, accounts, and optional catalog atomically", async () => {
    const service = await import("./provision-organization");
    const firstInput = input(`${suffix}-first`);
    const first = await service.provisionOrganization(firstInput, prisma);
    organizations.push(firstInput.organizationSlug);
    ownerEmails.push(firstInput.ownerEmail);

    const [organization, outlet, ownerMembership, outletMembership, settings, accountCount, expenseCategoryCount, product, category] = await Promise.all([
      prisma.organization.findUniqueOrThrow({ where: { id: first.organizationId } }),
      prisma.outlet.findUniqueOrThrow({ where: { id: first.outletId } }),
      prisma.organizationMembership.findUniqueOrThrow({ where: { organizationId_userId: { organizationId: first.organizationId, userId: first.ownerUserId } } }),
      prisma.outletMembership.findUniqueOrThrow({ where: { outletId_userId: { outletId: first.outletId, userId: first.ownerUserId } } }),
      prisma.appSetting.findFirstOrThrow({ where: { organizationId: first.organizationId, outletId: first.outletId } }),
      prisma.account.count({ where: { organizationId: first.organizationId } }),
      prisma.expenseCategory.count({ where: { organizationId: first.organizationId } }),
      prisma.product.findFirstOrThrow({ where: { organizationId: first.organizationId }, include: { outletProducts: true } }),
      prisma.category.findFirstOrThrow({ where: { organizationId: first.organizationId } }),
    ]);
    expect(organization.slug).toBe(firstInput.organizationSlug);
    expect(outlet.organizationId).toBe(organization.id);
    expect(ownerMembership.role).toBe("owner");
    expect(outletMembership.role).toBe("admin");
    expect(settings.outletId).toBe(outlet.id);
    expect(accountCount).toBe(6);
    expect(expenseCategoryCount).toBe(3);
    expect(product.outletProducts[0]?.outletId).toBe(outlet.id);
    expect(category.organizationId).toBe(organization.id);
  });

  it("provisions a second organization after one already exists", async () => {
    const service = await import("./provision-organization");
    const secondInput = input(`${suffix}-second`, { seedCatalog: false });
    const second = await service.provisionOrganization(secondInput, prisma);
    organizations.push(secondInput.organizationSlug);
    ownerEmails.push(secondInput.ownerEmail);
    expect(await prisma.organization.count({ where: { id: second.organizationId } })).toBe(1);
    expect(await prisma.account.count({ where: { organizationId: second.organizationId } })).toBe(6);
    expect(await prisma.product.count({ where: { organizationId: second.organizationId } })).toBe(0);
  });

  it("rolls back the organization and outlet when the owner email conflicts", async () => {
    const service = await import("./provision-organization");
    const conflictInput = input(`${suffix}-conflict`);
    conflictInput.ownerEmail = `owner-${suffix}-first@example.test`;
    await expect(service.provisionOrganization(conflictInput, prisma)).rejects.toMatchObject({ code: "P2002" });
    expect(await prisma.organization.count({ where: { slug: conflictInput.organizationSlug } })).toBe(0);
    expect(await prisma.outlet.count({ where: { organization: { slug: conflictInput.organizationSlug } } })).toBe(0);
  });
});
