import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCustomerDisplay,
  updateCustomerDisplayFromPayload,
} from "./customer-display-service";

const mocks = vi.hoisted(() => ({
  findCustomerDisplayState: vi.fn(),
  getSettings: vi.fn(),
  upsertCustomerDisplayState: vi.fn(),
}));

vi.mock("../repositories/customer-display-repository", () => ({
  findCustomerDisplayState: mocks.findCustomerDisplayState,
  upsertCustomerDisplayState: mocks.upsertCustomerDisplayState,
}));

vi.mock("@/features/catalog/repositories/settings-repository", () => ({
  getSettings: mocks.getSettings,
}));

describe("customer display service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSettings.mockResolvedValue({ storeName: "Maza Cafe" });
  });

  it("returns idle display when no state exists", async () => {
    mocks.findCustomerDisplayState.mockResolvedValue(null);

    await expect(getCustomerDisplay()).resolves.toEqual({
      status: "idle",
      storeName: "Maza Cafe",
      orderType: null,
      items: [],
      totals: {
        subtotalAmount: 0,
        discountAmount: 0,
        serviceChargeAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
      },
      paidOrderNumber: null,
      updatedAt: expect.any(String),
    });
  });

  it("stores active cart payloads", async () => {
    mocks.upsertCustomerDisplayState.mockResolvedValue({
      status: "active",
      storeName: "Maza Cafe",
      payload: {
        orderType: "takeaway",
        items: [
          {
            id: "line-1",
            productName: "Latte",
            quantity: 1,
            unitPrice: 25000,
            discountAmount: 0,
            lineTotal: 25000,
            selectedOptions: [],
          },
        ],
        totals: {
          subtotalAmount: 25000,
          discountAmount: 0,
          serviceChargeAmount: 0,
          taxAmount: 0,
          totalAmount: 25000,
        },
      },
      paidOrderNumber: null,
      paidAt: null,
      updatedAt: new Date("2026-06-03T08:00:00.000Z"),
    });

    const display = await updateCustomerDisplayFromPayload({
      status: "active",
      storeName: "Maza Cafe",
      orderType: "takeaway",
      items: [
        {
          id: "line-1",
          productName: "Latte",
          quantity: 1,
          unitPrice: 25000,
          discountAmount: 0,
          lineTotal: 25000,
          selectedOptions: [],
        },
      ],
      totals: {
        subtotalAmount: 25000,
        discountAmount: 0,
        serviceChargeAmount: 0,
        taxAmount: 0,
        totalAmount: 25000,
      },
    });

    expect(display.status).toBe("active");
    expect(display.items[0]?.productName).toBe("Latte");
    expect(mocks.upsertCustomerDisplayState).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active", storeName: "Maza Cafe" }),
    );
  });
});
