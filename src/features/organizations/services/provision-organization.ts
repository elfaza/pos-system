import type { Prisma, PrismaClient } from "@prisma/client";
import { ValidationError } from "@/lib/api-response";
import { hashPassword } from "@/features/auth/utils/password";

export interface ProvisionOrganizationInput {
  organizationName: string;
  organizationSlug: string;
  outletName: string;
  outletSlug: string;
  timeZone?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  seedCatalog?: boolean;
}

export interface ProvisionOrganizationResult {
  organizationId: string;
  outletId: string;
  ownerUserId: string;
}

type ProvisioningClient = Pick<PrismaClient, "$transaction">;

const accountDefinitions: Array<{ code: string; name: string; type: Prisma.AccountCreateInput["type"] }> = [
  { code: "1000", name: "Cash on Hand", type: "asset" },
  { code: "1010", name: "Bank and QRIS Clearing", type: "asset" },
  { code: "2000", name: "Tax Payable", type: "liability" },
  { code: "3000", name: "Owner Equity", type: "equity" },
  { code: "4000", name: "Sales Revenue", type: "income" },
  { code: "5000", name: "Operating Expense", type: "expense" },
];

function normalize(input: ProvisionOrganizationInput) {
  const organizationName = input.organizationName.trim();
  const organizationSlug = input.organizationSlug.trim().toLowerCase();
  const outletName = input.outletName.trim();
  const outletSlug = input.outletSlug.trim().toLowerCase();
  const ownerName = input.ownerName.trim();
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const ownerPassword = input.ownerPassword;
  const timeZone = input.timeZone?.trim() || "Asia/Jakarta";
  const errors: Record<string, string> = {};

  if (!organizationName) errors.organizationName = "Organization name is required.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(organizationSlug)) errors.organizationSlug = "Use lowercase letters, numbers, and single hyphens.";
  if (!outletName) errors.outletName = "Outlet name is required.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(outletSlug)) errors.outletSlug = "Use lowercase letters, numbers, and single hyphens.";
  if (!ownerName) errors.ownerName = "Owner name is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) errors.ownerEmail = "Use a valid owner email address.";
  if (ownerPassword.length < 12) errors.ownerPassword = "Owner password must contain at least 12 characters.";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    errors.timeZone = "Use a valid IANA time zone.";
  }
  if (Object.keys(errors).length) throw new ValidationError("Organization provisioning input is invalid.", errors);

  return { organizationName, organizationSlug, outletName, outletSlug, ownerName, ownerEmail, ownerPassword, timeZone };
}

export async function provisionOrganization(
  input: ProvisionOrganizationInput,
  client: ProvisioningClient,
): Promise<ProvisionOrganizationResult> {
  const values = normalize(input);
  const passwordHash = await hashPassword(values.ownerPassword);

  return client.$transaction(async (tx: Prisma.TransactionClient) => {
    const organization = await tx.organization.create({
      data: { name: values.organizationName, slug: values.organizationSlug },
    });
    const outlet = await tx.outlet.create({
      data: {
        organizationId: organization.id,
        name: values.outletName,
        slug: values.outletSlug,
        timeZone: values.timeZone,
      },
    });
    const owner = await tx.user.create({
      data: {
        name: values.ownerName,
        email: values.ownerEmail,
        passwordHash,
        role: "admin",
      },
    });
    await tx.organizationMembership.create({
      data: { organizationId: organization.id, userId: owner.id, role: "owner" },
    });
    await tx.outletMembership.create({
      data: { organizationId: organization.id, outletId: outlet.id, userId: owner.id, role: "admin" },
    });
    await tx.appSetting.create({
      data: {
        organizationId: organization.id,
        outletId: outlet.id,
        storeName: values.outletName,
      },
    });

    const accounts = await Promise.all(accountDefinitions.map((account) => tx.account.create({
      data: {
        organizationId: organization.id,
        // Global legacy uniqueness remains until the contract migration.
        code: `${values.organizationSlug.toUpperCase()}-${account.code}`,
        name: account.name,
        type: account.type,
      },
    })));
    const expenseAccount = accounts.find((account) => account.type === "expense")!;
    for (const name of ["Supplies", "Utilities", "Maintenance"]) {
      await tx.expenseCategory.create({
        data: {
          organizationId: organization.id,
          name: `${values.organizationName} ${name}`,
          accountId: expenseAccount.id,
        },
      });
    }

    if (input.seedCatalog) {
      const category = await tx.category.create({
        data: {
          organizationId: organization.id,
          name: "General",
          slug: `${values.organizationSlug}-general`,
        },
      });
      const product = await tx.product.create({
        data: {
          organizationId: organization.id,
          categoryId: category.id,
          name: "Sample Product",
          sku: `${values.organizationSlug.toUpperCase()}-SAMPLE`,
          price: "0",
          outletProducts: { create: { outletId: outlet.id, isAvailable: true } },
        },
      });
      void product;
    }

    return { organizationId: organization.id, outletId: outlet.id, ownerUserId: owner.id };
  });
}
