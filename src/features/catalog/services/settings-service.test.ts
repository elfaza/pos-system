import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/lib/api-response";
import { updateSettingsFromPayload } from "./settings-service";

const mocks = vi.hoisted(() => ({
  activityLogCreate: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    activityLog: { create: mocks.activityLogCreate },
  },
}));

vi.mock("../repositories/settings-repository", () => ({
  getSettings: vi.fn(),
  updateSettings: mocks.updateSettings,
}));

const actor = {
  id: "admin-1",
  name: "Admin",
  email: "admin@pos.local",
  role: "admin" as const,
};

const validPayload = {
  storeName: "Maza Cafe",
  storeAddress: "Jakarta",
  storePhone: "08123",
  logoUrl: "",
  taxEnabled: true,
  taxRate: "10",
  serviceChargeEnabled: false,
  serviceChargeRate: "0",
  refundWindowHours: "24",
  autoRestoreStockOnRefund: false,
  receiptFooter: "Thank you",
  locale: "id-ID",
  currencyCode: "IDR",
  timeZone: "Asia/Jakarta",
  businessDayStartTime: "04:00",
  cashPaymentEnabled: true,
  qrisPaymentEnabled: false,
  kitchenEnabled: true,
  queueEnabled: true,
  inventoryEnabled: true,
  accountingEnabled: true,
  reportingEnabled: true,
  receiptPrintingEnabled: true,
};

describe("settings service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateSettings.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({
        id: "settings-1",
        createdAt: new Date("2026-05-05T00:00:00.000Z"),
        updatedAt: new Date("2026-05-05T00:00:00.000Z"),
        ...data,
      }),
    );
    mocks.activityLogCreate.mockResolvedValue({});
  });

  it("saves expanded typed store and module settings", async () => {
    const settings = await updateSettingsFromPayload(validPayload, actor);

    expect(settings).toMatchObject({
      storeName: "Maza Cafe",
      locale: "id-ID",
      currencyCode: "IDR",
      timeZone: "Asia/Jakarta",
      businessDayStartTime: "04:00",
      cashPaymentEnabled: true,
      qrisPaymentEnabled: false,
      kitchenEnabled: true,
      queueEnabled: true,
      inventoryEnabled: true,
      accountingEnabled: true,
      reportingEnabled: true,
      receiptPrintingEnabled: true,
    });
    expect(mocks.updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "id-ID",
        currencyCode: "IDR",
        timeZone: "Asia/Jakarta",
        businessDayStartTime: "04:00",
        cashPaymentEnabled: true,
        qrisPaymentEnabled: false,
      }),
    );
    expect(mocks.activityLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "settings.updated",
        entityType: "app_settings",
      }),
    });
  });

  it("rejects invalid locale, timezone, time, money, and payment settings", async () => {
    await expect(
      updateSettingsFromPayload(
        {
          ...validPayload,
          storeName: "",
          taxRate: "-1",
          serviceChargeRate: "-2",
          refundWindowHours: "-3",
          locale: "not a locale",
          currencyCode: "INVALID",
          timeZone: "Not/AZone",
          businessDayStartTime: "25:00",
          cashPaymentEnabled: false,
          qrisPaymentEnabled: false,
        },
        actor,
      ),
    ).rejects.toMatchObject({
      fieldErrors: expect.objectContaining({
        storeName: "Store name is required.",
        taxRate: "Tax rate must be at least 0.",
        serviceChargeRate: "Service charge rate must be at least 0.",
        refundWindowHours: "Refund window must be at least 0.",
        locale: "Use a valid locale.",
        currencyCode: "Use a valid ISO 4217 currency code.",
        timeZone: "Use a valid IANA time zone.",
        businessDayStartTime: "Use a valid 24-hour time.",
        cashPaymentEnabled: "At least one payment method must be enabled.",
        qrisPaymentEnabled: "At least one payment method must be enabled.",
      }),
    });
    expect(mocks.updateSettings).not.toHaveBeenCalled();
  });

  it("throws a validation error for missing required new fields", async () => {
    await expect(
      updateSettingsFromPayload(
        {
          storeName: "Maza Cafe",
          taxRate: "0",
          serviceChargeRate: "0",
          cashPaymentEnabled: true,
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mocks.updateSettings).not.toHaveBeenCalled();
  });
});
