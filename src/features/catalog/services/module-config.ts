import type { Prisma } from "@prisma/client";
import { ForbiddenError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getSettings } from "../repositories/settings-repository";

type SettingsClient = typeof prisma | Prisma.TransactionClient;

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

export async function getAppConfiguration(client?: SettingsClient) {
  return getSettings(client);
}

export async function requireModuleEnabled(
  flag: ModuleFlag,
  client?: SettingsClient,
) {
  const settings = await getAppConfiguration(client);
  if (!settings[flag]) {
    throw new ForbiddenError(`${moduleLabels[flag]} module is disabled.`);
  }
  return settings;
}

export async function requireCashPaymentEnabled(client?: SettingsClient) {
  const settings = await getAppConfiguration(client);
  if (!settings.cashPaymentEnabled) {
    throw new ForbiddenError("Cash payment is disabled.");
  }
  return settings;
}
