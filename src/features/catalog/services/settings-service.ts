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

function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function isValidLocale(locale: string) {
  try {
    return Intl.getCanonicalLocales(locale).length > 0;
  } catch {
    return false;
  }
}

function isValidCurrencyCode(currencyCode: string, locale: string) {
  if (!/^[A-Z]{3}$/.test(currencyCode)) return false;

  try {
    new Intl.NumberFormat(locale || "en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(1);
    return true;
  } catch {
    return false;
  }
}

function parseBusinessDayStartTime(value: unknown) {
  const time = optionalString(value) ?? "";
  if (!time) return "";
  if (!/^\d{2}:\d{2}$/.test(time)) return time;

  const [hour, minute] = time.split(":").map(Number);
  if (hour > 23 || minute > 59) return time;

  return time;
}

function parseSettingsPayload(payload: Record<string, unknown>) {
  const storeName = optionalString(payload.storeName) ?? "";
  const taxRate = toDecimalString(payload.taxRate, "0");
  const serviceChargeRate = toDecimalString(payload.serviceChargeRate, "0");
  const locale = optionalString(payload.locale) ?? "";
  const currencyCode = optionalString(payload.currencyCode)?.toUpperCase() ?? "";
  const timeZone = optionalString(payload.timeZone) ?? "";
  const businessDayStartTime = parseBusinessDayStartTime(payload.businessDayStartTime);
  const cashPaymentEnabled = toBoolean(payload.cashPaymentEnabled, true);
  const qrisPaymentEnabled = toBoolean(payload.qrisPaymentEnabled, false);
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
  if (!locale) {
    fieldErrors.locale = "Locale is required.";
  } else if (!isValidLocale(locale)) {
    fieldErrors.locale = "Use a valid locale.";
  }
  if (!currencyCode) {
    fieldErrors.currencyCode = "Currency code is required.";
  } else if (!isValidCurrencyCode(currencyCode, locale)) {
    fieldErrors.currencyCode = "Use a valid ISO 4217 currency code.";
  }
  if (!timeZone) {
    fieldErrors.timeZone = "Time zone is required.";
  } else if (!isValidTimeZone(timeZone)) {
    fieldErrors.timeZone = "Use a valid IANA time zone.";
  }
  if (!businessDayStartTime) {
    fieldErrors.businessDayStartTime = "Business day start time is required.";
  } else if (!/^\d{2}:\d{2}$/.test(businessDayStartTime)) {
    fieldErrors.businessDayStartTime = "Use HH:mm format.";
  } else {
    const [hour, minute] = businessDayStartTime.split(":").map(Number);
    if (hour > 23 || minute > 59) {
      fieldErrors.businessDayStartTime = "Use a valid 24-hour time.";
    }
  }
  if (refundWindowHours !== null && refundWindowHours < 0) {
    fieldErrors.refundWindowHours = "Refund window must be at least 0.";
  }
  if (!cashPaymentEnabled && !qrisPaymentEnabled) {
    fieldErrors.cashPaymentEnabled = "At least one payment method must be enabled.";
    fieldErrors.qrisPaymentEnabled = "At least one payment method must be enabled.";
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
    locale,
    currencyCode,
    timeZone,
    businessDayStartTime,
    cashPaymentEnabled,
    qrisPaymentEnabled,
    kitchenEnabled: toBoolean(payload.kitchenEnabled, true),
    queueEnabled: toBoolean(payload.queueEnabled, true),
    inventoryEnabled: toBoolean(payload.inventoryEnabled, true),
    accountingEnabled: toBoolean(payload.accountingEnabled, true),
    reportingEnabled: toBoolean(payload.reportingEnabled, true),
    receiptPrintingEnabled: toBoolean(payload.receiptPrintingEnabled, true),
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
