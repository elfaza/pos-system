import { ForbiddenError } from "@/lib/api-response";
import { requireTenantContext } from "@/features/auth/services/session-service";
import type { Prisma } from "@prisma/client";
import { getSettings } from "../repositories/settings-repository";

type ModuleFlag =
  | "accountingEnabled"
  | "inventoryEnabled"
  | "kitchenEnabled"
  | "queueEnabled"
  | "reportingEnabled";

const moduleLabels: Record<ModuleFlag, string> = {
  accountingEnabled: "Accounting",
  inventoryEnabled: "Inventory",
  kitchenEnabled: "Kitchen",
  queueEnabled: "Queue",
  reportingEnabled: "Reporting",
};

export async function getAppConfiguration(client?: Prisma.TransactionClient) {
  const context = await requireTenantContext();
  return getSettings(context, client);
}

export async function requireModuleEnabled(
  flag: ModuleFlag,
  client?: Prisma.TransactionClient,
) {
  const settings = await getAppConfiguration(client);
  if (!settings[flag]) {
    throw new ForbiddenError(`${moduleLabels[flag]} module is disabled.`);
  }
  return settings;
}

export async function requireCashPaymentEnabled(client?: Prisma.TransactionClient) {
  const settings = await getAppConfiguration(client);
  if (!settings.cashPaymentEnabled) {
    throw new ForbiddenError("Cash payment is disabled.");
  }
  return settings;
}
