import { describe, expect, it, vi } from "vitest";
import type { SettingsRecord } from "@/features/catalog/types";
import type { CheckoutOrderRecord } from "@/features/checkout/types";
import {
  buildReceiptEscPos,
  buildReceiptThermerPayload,
  getReceiptPrinterName,
  printReceiptToSystemPrinter,
} from "./receipt-printer";

const baseSettings: SettingsRecord = {
  storeName: "Maza Cafe",
  storeAddress: "Jakarta",
  storePhone: "+62 812 0000 0000",
  logoUrl: null,
  taxEnabled: true,
  taxRate: 10,
  serviceChargeEnabled: true,
  serviceChargeRate: 5,
  refundWindowHours: null,
  autoRestoreStockOnRefund: false,
  receiptFooter: "Thank you for visiting.",
  locale: "en-US",
  currencyCode: "IDR",
  timeZone: "Asia/Jakarta",
  businessDayStartTime: "00:00",
  cashPaymentEnabled: true,
  qrisPaymentEnabled: true,
  dineInPayLaterEnabled: true,
  kitchenEnabled: true,
  queueEnabled: true,
  inventoryEnabled: true,
  accountingEnabled: true,
  reportingEnabled: true,
  receiptPrintingEnabled: true,
};

const baseOrder: CheckoutOrderRecord = {
  id: "order-1",
  orderNumber: "POS-20260526-001",
  orderType: "dine_in",
  tableId: "table-1",
  tableName: "A1",
  deliveryCustomerName: null,
  deliveryCustomerPhone: null,
  deliveryAddress: null,
  deliveryNotes: null,
  cashierName: "Cashier",
  cashierEmail: "cashier@pos.local",
  status: "paid",
  queueBusinessDate: "2026-05-26",
  queueNumber: 7,
  kitchenStatus: "received",
  kitchenPreparingAt: null,
  kitchenReadyAt: null,
  kitchenCompletedAt: null,
  subtotalAmount: 43000,
  discountAmount: 0,
  taxAmount: 4730,
  serviceChargeAmount: 2150,
  totalAmount: 49880,
  heldAt: null,
  paidAt: "2026-05-26T14:01:46.000Z",
  createdAt: "2026-05-26T14:00:00.000Z",
  items: [
    {
      id: "item-1",
      productId: "product-1",
      variantId: null,
      productNameSnapshot: "Caffe Latte Medium With Extra Long Name",
      variantNameSnapshot: null,
      quantity: 1,
      unitPrice: 43000,
      discountAmount: 0,
      lineTotal: 43000,
      notes: "Less sugar",
      optionSelections: [
        {
          id: "selection-1",
          optionGroupId: "size",
          optionValueId: "medium",
          groupNameSnapshot: "Size",
          valueNameSnapshot: "Medium",
          priceDelta: 0,
        },
      ],
    },
  ],
  payment: {
    id: "payment-1",
    method: "qris",
    status: "paid",
    amount: 49880,
    cashReceivedAmount: null,
    changeAmount: null,
    paidAt: "2026-05-26T14:01:46.000Z",
  },
};

describe("receipt-printer", () => {
  it("builds readable ESC/POS receipt bytes instead of PostScript", () => {
    const receipt = buildReceiptEscPos(baseOrder, baseSettings, {
      printedAt: new Date("2026-05-26T14:02:00.000Z"),
    });
    const text = receipt.toString("latin1");
    const lines = text.split("\n");

    expect(text.startsWith("\x1b@")).toBe(true);
    expect(text).toContain("MAZA CAFE");
    expect(lines).toContain("MAZA CAFE");
    expect(lines).not.toContain("           MAZA CAFE");
    expect(text).toContain("BILL: POS-20260526-001");
    expect(text).toContain("TYPE: DINE-IN");
    expect(text).toContain("CAFFE LATTE MEDIUM WITH");
    expect(text).toContain("EXTRA LONG NAME");
    expect(text).toContain("* SIZE: MEDIUM");
    expect(text).toContain("TOTAL");
    expect(text).toContain("49,880");
    expect(text).toContain("NO PANGGIL:");
    expect(text).toContain("\n7\n");
    expect(text).not.toContain("%!PS-Adobe");
  });

  it("uses a configured printer name and rejects unsafe names", () => {
    expect(getReceiptPrinterName({ POS_RECEIPT_PRINTER: "_58Printer" })).toBe("_58Printer");
    expect(() => getReceiptPrinterName({ POS_RECEIPT_PRINTER: "bad;rm -rf" })).toThrow(
      "Printer name contains unsupported characters.",
    );
  });

  it("submits receipt bytes to lp as a raw job", async () => {
    const write = vi.fn((chunk: Buffer, callback: (error?: Error | null) => void) =>
      callback(null),
    );
    const end = vi.fn();
    const on = vi.fn((event: string, callback: (code?: number) => void) => {
      if (event === "close") callback(0);
      return childProcess;
    });
    const childProcess = {
      stdin: { write, end },
      on,
    };
    const spawn = vi.fn(() => childProcess);

    await printReceiptToSystemPrinter(baseOrder, baseSettings, {
      env: { POS_RECEIPT_PRINTER: "_58Printer" },
      printedAt: new Date("2026-05-26T14:02:00.000Z"),
      spawn,
    });

    expect(spawn).toHaveBeenCalledWith("lp", ["-d", "_58Printer", "-o", "raw"]);
    expect(write.mock.calls[0]?.[0].toString("latin1")).toContain("MAZA CAFE");
    expect(end).toHaveBeenCalled();
  });

  it("builds Thermer JSON payload for Android Bluetooth printing", () => {
    const payload = buildReceiptThermerPayload(baseOrder, baseSettings, {
      printedAt: new Date("2026-05-26T14:02:00.000Z"),
    });

    expect(payload[0]).toMatchObject({
      type: 0,
      content: "MAZA CAFE",
      bold: 1,
      align: 1,
      format: 3,
    });
    expect(payload).toContainEqual(
      expect.objectContaining({ type: 0, content: "BILL: POS-20260526-001" }),
    );
    expect(payload).toContainEqual(
      expect.objectContaining({ type: 0, content: "CAFFE LATTE MEDIUM WITH 1 43,000" }),
    );
    expect(payload).toContainEqual(
      expect.objectContaining({ type: 0, content: `TOTAL${" ".repeat(21)}49,880`, bold: 1 }),
    );
    expect(payload).toContainEqual(
      expect.objectContaining({ type: 0, content: "7", bold: 1, align: 1, format: 2 }),
    );
  });

  it("keeps Thermer amount columns padded to the right paper edge", () => {
    const payload = buildReceiptThermerPayload(baseOrder, baseSettings, {
      printedAt: new Date("2026-05-26T14:02:00.000Z"),
    });

    const amountLines = payload
      .map((entry) => entry.content)
      .filter((content) => /^(SUB TOTAL|SERVICE|TOTAL|PB1|- QRIS)/.test(content));

    expect(amountLines).toHaveLength(5);
    for (const content of amountLines) {
      expect(content).toHaveLength(32);
    }
  });
});
