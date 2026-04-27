import { prisma } from "@/lib/prisma";
import { ValidationError } from "@/lib/api-response";
import {
  toBoolean,
  toDecimalString,
  toInteger,
} from "@/lib/number";
import type { User } from "@/features/auth/types";
import { getSettings, updateSettings } from "../repositories/settings-repository";
import { mapSettings } from "./catalog-mappers";

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseSettingsPayload(payload: Record<string, unknown>) {
  const storeName = optionalString(payload.storeName) ?? "";
  const taxRate = toDecimalString(payload.taxRate, "0");
  const serviceChargeRate = toDecimalString(payload.serviceChargeRate, "0");
  const refundWindowRaw = payload.refundWindowHours;
  const refundWindowHours =
    refundWindowRaw === null || refundWindowRaw === "" || refundWindowRaw === undefined
      ? null
      : toInteger(refundWindowRaw, -1);
  const fieldErrors: Record<string, string> = {};

  if (!storeName) fieldErrors.storeName = "Store name is required.";
  if (Number(taxRate) < 0) fieldErrors.taxRate = "Tax rate must be at least 0.";
  if (Number(serviceChargeRate) < 0) {
    fieldErrors.serviceChargeRate = "Service charge rate must be at least 0.";
  }
  if (refundWindowHours !== null && refundWindowHours < 0) {
    fieldErrors.refundWindowHours = "Refund window must be at least 0.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError("Settings validation failed.", fieldErrors);
  }

  return {
    storeName,
    storeAddress: optionalString(payload.storeAddress),
    storePhone: optionalString(payload.storePhone),
    logoUrl: optionalString(payload.logoUrl),
    taxEnabled: toBoolean(payload.taxEnabled, false),
    taxRate,
    serviceChargeEnabled: toBoolean(payload.serviceChargeEnabled, false),
    serviceChargeRate,
    refundWindowHours,
    autoRestoreStockOnRefund: toBoolean(payload.autoRestoreStockOnRefund, false),
    receiptFooter: optionalString(payload.receiptFooter),
  };
}

export async function getAppSettings() {
  return mapSettings(await getSettings());
}

export async function updateSettingsFromPayload(
  payload: Record<string, unknown>,
  actor: User,
) {
  const settings = await updateSettings(parseSettingsPayload(payload));

  await prisma.activityLog.create({
    data: {
      userId: actor.id,
      action: "settings.updated",
      entityType: "app_settings",
      entityId: settings.id,
    },
  });

  return mapSettings(settings);
}
