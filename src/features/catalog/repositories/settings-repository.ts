import { prisma } from "@/lib/prisma";

export async function getSettings() {
  const existing = await prisma.appSetting.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return existing;
  }

  return prisma.appSetting.create({
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
}) {
  const settings = await getSettings();

  return prisma.appSetting.update({
    where: { id: settings.id },
    data,
  });
}
