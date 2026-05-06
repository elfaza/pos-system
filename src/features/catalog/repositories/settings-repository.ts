import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type SettingsClient = typeof prisma | Prisma.TransactionClient;

export async function getSettings(client: SettingsClient = prisma) {
  const existing = await client.appSetting.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return existing;
  }

  return client.appSetting.create({
    data: {
      storeName: "Maza Cafe",
      taxRate: "0",
      serviceChargeRate: "0",
    },
  });
}

export async function updateSettings(data: {
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
  kitchenEnabled: boolean;
  queueEnabled: boolean;
  inventoryEnabled: boolean;
  accountingEnabled: boolean;
  reportingEnabled: boolean;
  receiptPrintingEnabled: boolean;
}) {
  const settings = await getSettings();

  return prisma.appSetting.update({
    where: { id: settings.id },
    data,
  });
}
