import { describe, expect, it, vi } from "vitest";
import type { KitchenTicketRecord } from "@/features/kitchen/types";
import {
  buildKitchenTicketEscPos,
  printKitchenTicketToSystemPrinter,
} from "./kitchen-ticket-printer";

const ticket: KitchenTicketRecord = {
  orderId: "order-1",
  orderNumber: "POS-20260526-001",
  orderType: "takeaway",
  queueBusinessDate: "2026-05-26",
  queueNumber: 12,
  kitchenStatus: "received",
  tableName: null,
  deliveryCustomerName: null,
  deliveryAddress: null,
  paidAt: "2026-05-26T14:10:00.000Z",
  items: [
    {
      id: "item-1",
      name: "Caffe Latte Medium With Extra Long Name",
      quantity: 2,
      notes: "No sugar",
      options: [
        { groupName: "Temperature", valueName: "Iced" },
        { groupName: "Milk", valueName: "Oat milk" },
      ],
    },
  ],
};

describe("kitchen-ticket-printer", () => {
  it("builds readable ESC/POS kitchen ticket bytes", () => {
    const receipt = buildKitchenTicketEscPos(ticket, {
      printedAt: new Date("2026-05-26T14:11:00.000Z"),
    });
    const text = receipt.toString("latin1");

    expect(text.startsWith("\x1b@")).toBe(true);
    expect(text).toContain("KITCHEN");
    expect(text).toContain("#12");
    expect(text).toContain("POS-20260526-001");
    expect(text).toContain("TAKE-AWAY");
    expect(text).toContain("2X CAFFE LATTE MEDIUM WITH");
    expect(text).toContain("* TEMPERATURE: ICED");
    expect(text).toContain("* MILK: OAT MILK");
    expect(text).toContain("NOTE: NO SUGAR");
    expect(text).not.toContain("%!PS-Adobe");
  });

  it("submits kitchen ticket bytes to lp as a raw job", async () => {
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

    await printKitchenTicketToSystemPrinter(ticket, {
      env: {
        POS_KITCHEN_PRINTER: "_KitchenPrinter",
        POS_RECEIPT_PRINTER: "_58Printer",
      },
      printedAt: new Date("2026-05-26T14:11:00.000Z"),
      spawn,
    });

    expect(spawn).toHaveBeenCalledWith("lp", ["-d", "_KitchenPrinter", "-o", "raw"]);
    expect(write.mock.calls[0]?.[0].toString("latin1")).toContain("KITCHEN");
    expect(end).toHaveBeenCalled();
  });

  it("falls back to the receipt printer when no kitchen printer is configured", async () => {
    const write = vi.fn((chunk: Buffer, callback: (error?: Error | null) => void) =>
      callback(null),
    );
    const childProcess = {
      stdin: { write, end: vi.fn() },
      on: vi.fn((event: string, callback: (code?: number) => void) => {
        if (event === "close") callback(0);
        return childProcess;
      }),
    };
    const spawn = vi.fn(() => childProcess);

    await printKitchenTicketToSystemPrinter(ticket, {
      env: { POS_RECEIPT_PRINTER: "_58Printer" },
      spawn,
    });

    expect(spawn).toHaveBeenCalledWith("lp", ["-d", "_58Printer", "-o", "raw"]);
  });
});
