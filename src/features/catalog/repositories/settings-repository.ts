import type { AppSetting, Prisma } from "@prisma/client";
import type { TenantContext } from "@/features/auth/types";
import { requireTenantContext } from "@/features/auth/services/session-service";
import { withTenantTransaction } from "@/lib/tenant-prisma";

export async function getSettings(
  context?: TenantContext,
  client?: Prisma.TransactionClient,
): Promise<AppSetting> {
  const tenant = context ?? await requireTenantContext();
  if (!client) {
    return withTenantTransaction(tenant, (tx) => getSettings(tenant, tx));
  }

  const scope = {
    organizationId: tenant.organizationId,
    outletId: tenant.outletId,
  };
  await client.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtext(${scope.organizationId}), hashtext(${scope.outletId}))::text
  `;
  const existing = await client.appSetting.findFirst({
    where: scope,
    orderBy: { createdAt: "asc" },
  });

  if (existing) return existing;

  return client.appSetting.create({
    data: {
      ...scope,
      storeName: "Maza Cafe",
      taxRate: "0",
      serviceChargeRate: "0",
      qrisPaymentEnabled: true,
    },
  });
}

export async function updateSettings(
  context: TenantContext,
  data: {
    storeName: string;
    storeAddress: string | null;
    storePhone: string | null;
    logoUrl: string | null;
    taxEnabled: boolean;
    taxRate: string;
    serviceChargeEnabled: boolean;
    serviceChargeRate: string;
    refundWindowHours: number | null;
    autoRestoreStockOnRefund: boolean;
    receiptFooter: string | null;
    locale: string;
    currencyCode: string;
    timeZone: string;
    businessDayStartTime: string;
    cashPaymentEnabled: boolean;
    qrisPaymentEnabled: boolean;
    dineInPayLaterEnabled: boolean;
    kitchenEnabled: boolean;
    queueEnabled: boolean;
    inventoryEnabled: boolean;
    accountingEnabled: boolean;
    reportingEnabled: boolean;
    receiptPrintingEnabled: boolean;
  },
  client?: Prisma.TransactionClient,
): Promise<AppSetting> {
  if (!client) return withTenantTransaction(context, (tx) => updateSettings(context, data, tx));
  {
    const tx = client;
    const settings = await getSettings(context, tx);
    const updated = await tx.appSetting.updateMany({
      where: {
        id: settings.id,
        organizationId: context.organizationId,
        outletId: context.outletId,
      },
      data,
    });
    if (updated.count === 0) return getSettings(context, tx);
    return tx.appSetting.findFirstOrThrow({
      where: {
        id: settings.id,
        organizationId: context.organizationId,
        outletId: context.outletId,
      },
    });
  }
}
