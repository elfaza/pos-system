import { describe, expect, it, vi } from "vitest";
import type { KitchenTicketRecord } from "@/features/kitchen/types";
import {
  buildOrderLabels,
  buildOrderLabelsEscPos,
  buildOrderLabelsThermerPayload,
  printOrderLabelsToSystemPrinter,
} from "./order-label-printer";

const LABEL_COLUMNS = 32;
/** Local-time construction keeps the expected 14/06 14:42 stable in any TZ. */
const printedAt = new Date(2026, 5, 14, 14, 42, 0);

function createTicket(
  overrides: Partial<KitchenTicketRecord> = {},
): KitchenTicketRecord {
  return {
    orderId: "order-1",
    orderNumber: "POS-20260614-214008-36VU",
    orderType: "takeaway",
    queueBusinessDate: "2026-06-14",
    queueNumber: 11,
    kitchenStatus: "received",
    tableName: null,
    deliveryCustomerName: null,
    deliveryAddress: null,
    paidAt: "2026-06-14T14:40:00.000Z",
    items: [
      {
        id: "item-1",
        name: "Cafe Latte",
        quantity: 1,
        notes: null,
        options: [
          { groupName: "Hot or Ice", valueName: "Ice" },
          { groupName: "Less/No Sugar", valueName: "Less Sugar" },
        ],
      },
    ],
    ...overrides,
  };
}

/** Slots, not lines: a double height line occupies two of the eight. */
function countSlots(label: { doubleHeight: boolean }[]): number {
  return label.reduce((total, line) => total + (line.doubleHeight ? 2 : 1), 0);
}

describe("order-label-printer", () => {
  it("prints one label per physical unit and indexes them across the order", () => {
    const ticket = createTicket({
      items: [
        {
          id: "item-1",
          name: "Cafe Latte",
          quantity: 2,
          notes: null,
          options: [],
        },
        {
          id: "item-2",
          name: "Roti Bakar",
          quantity: 1,
          notes: null,
          options: [],
        },
      ],
    });

    const labels = buildOrderLabels(ticket, { printedAt });
    const footers = labels.map((label) => label[label.length - 1].text);

    expect(labels).toHaveLength(3);
    expect(footers[0]).toContain("1/3");
    expect(footers[1]).toContain("2/3");
    expect(footers[2]).toContain("3/3");
  });

  it("lays out the header, product name and footer", () => {
    const [label] = buildOrderLabels(createTicket(), { printedAt });
    const text = label.map((line) => line.text);

    expect(text[0]).toContain("011");
    expect(text[0]).toContain("214008-36VU");
    expect(text[0].endsWith("TKA")).toBe(true);
    expect(text[1]).toBe("CAFE LATTE");
    expect(label[1].doubleHeight).toBe(true);
    expect(text[text.length - 1]).toContain("14:42");
    expect(text[text.length - 1]).toContain("1/1");
  });

  it("keeps every label within the paper width and exactly eight slots", () => {
    const labels = buildOrderLabels(
      createTicket({
        items: [
          {
            id: "item-1",
            name: "Rice Bowl Dendeng Batokok Special",
            quantity: 1,
            notes: "Tolong gelasnya dipisah dan sendoknya dua",
            options: [
              { groupName: "Hot or Ice", valueName: "Ice" },
              { groupName: "Sugar", valueName: "Less Sugar" },
              { groupName: "Coffee", valueName: "Double Shot" },
            ],
          },
        ],
      }),
      { printedAt },
    );

    for (const label of labels) {
      expect(countSlots(label)).toBe(10);

      for (const line of label) {
        expect(line.text.length).toBeLessThanOrEqual(LABEL_COLUMNS);
      }
    }
  });

  it("joins option values inline without their group names", () => {
    const [label] = buildOrderLabels(createTicket(), { printedAt });

    expect(label.map((line) => line.text)).toContain("ICE, LESS SUGAR");
  });

  it("prefixes item notes so the barista can tell them from variants", () => {
    const [label] = buildOrderLabels(
      createTicket({
        items: [
          {
            id: "item-1",
            name: "Tea",
            quantity: 1,
            notes: "Gelasnya dipisah",
            options: [],
          },
        ],
      }),
      { printedAt },
    );

    expect(label.map((line) => line.text)).toContain("NOTE: GELASNYA DIPISAH");
  });

  it("continues onto a second label when variants and notes overflow", () => {
    const labels = buildOrderLabels(
      createTicket({
        items: [
          {
            id: "item-1",
            name: "Cafe Latte",
            quantity: 1,
            notes:
              "Tolong gelasnya dipisah dan sendoknya dua ya terima kasih banyak sudah membantu pesanan ini dengan sangat baik sekali",
            options: [
              { groupName: "Hot or Ice", valueName: "Ice" },
              { groupName: "Sugar", valueName: "Less Sugar" },
              { groupName: "Ice", valueName: "Less Ice" },
              { groupName: "Coffee", valueName: "Double Shot" },
              { groupName: "Temperature", valueName: "Extra Hot" },
              { groupName: "Cream", valueName: "No Whipped Cream" },
            ],
          },
        ],
      }),
      { printedAt },
    );

    expect(labels.length).toBeGreaterThan(1);
    expect(labels[0][1].text).toContain("(1/2)");
    expect(labels[1][1].text).toContain("(2/2)");
    expect(labels[0][labels[0].length - 1]).toEqual(
      labels[1][labels[1].length - 1],
    );
  });

  it("omits the continuation marker when one label is enough", () => {
    const [label] = buildOrderLabels(createTicket(), { printedAt });

    expect(label[1].text).not.toContain("(");
  });

  it("pins line spacing and feeds the remaining pitch after each label", () => {
    const escPos = buildOrderLabelsEscPos(createTicket(), {
      printedAt,
      labelPitchDots: 264,
    });
    const text = escPos.toString("latin1");

    expect(text.startsWith("\x1b@\x1b3\x18")).toBe(true);
    // 264 pitch less the 240 dots of content leaves just the die-cut gap.
    expect(text).toContain(`\x1bJ${String.fromCharCode(24)}`);
    expect(text).toContain("CAFE LATTE\n");
    expect(text).not.toContain("\x1dV");
  });

  it("keeps column padding intact in the Thermer payload", () => {
    const payload = buildOrderLabelsThermerPayload(createTicket(), {
      printedAt,
    });
    const header = payload[0].content;

    expect(header).toContain("011");
    expect(header.endsWith("TKA")).toBe(true);
    expect(header).toMatch(/ {2,}/);
    expect(
      payload.some((entry) => /^14\/06 14:42 {2,}1\/1$/.test(entry.content)),
    ).toBe(true);
  });

  it("submits label bytes to lp as a raw job", async () => {
    const write = vi.fn(
      (chunk: Buffer, callback: (error?: Error | null) => void) =>
        callback(null),
    );
    const end = vi.fn();
    const on = vi.fn((event: string, callback: (code?: number) => void) => {
      if (event === "close") callback(0);
      return childProcess;
    });
    const childProcess = { stdin: { write, end }, on };
    const spawn = vi.fn(() => childProcess);

    await printOrderLabelsToSystemPrinter(createTicket(), {
      env: { POS_LABEL_PRINTER: "_58Printer" },
      printedAt,
      spawn: spawn as never,
    });

    expect(spawn).toHaveBeenCalledWith("lp", ["-d", "_58Printer", "-o", "raw"]);
    expect(write.mock.calls[0]?.[0].toString("latin1")).toContain("CAFE LATTE");
    expect(end).toHaveBeenCalled();
  });
});
