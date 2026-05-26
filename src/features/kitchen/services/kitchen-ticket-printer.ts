import { spawn as spawnChildProcess } from "node:child_process";
import {
  getReceiptPrinterName,
  type ThermerTextEntry,
} from "@/features/checkout/services/receipt-printer";
import type { KitchenTicketRecord } from "@/features/kitchen/types";

type Spawn = typeof spawnChildProcess;

const ESC = "\x1b";
const GS = "\x1d";
const TICKET_COLUMNS = 32;

export interface KitchenTicketPrinterOptions {
  env?: {
    POS_KITCHEN_PRINTER?: string;
    POS_RECEIPT_PRINTER?: string;
  };
  printedAt?: Date;
  spawn?: Spawn;
}

function getKitchenPrinterName(env: KitchenTicketPrinterOptions["env"]): string {
  const printerName =
    env?.POS_KITCHEN_PRINTER?.trim() ||
    env?.POS_RECEIPT_PRINTER?.trim() ||
    process.env.POS_KITCHEN_PRINTER?.trim() ||
    process.env.POS_RECEIPT_PRINTER;

  return getReceiptPrinterName({
    POS_RECEIPT_PRINTER: printerName,
  });
}

function sanitizeTicketText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatOrderTypeLabel(orderType: KitchenTicketRecord["orderType"]) {
  if (orderType === "dine_in") return "DINE-IN";
  if (orderType === "delivery") return "DELIVERY";
  return "TAKE-AWAY";
}

function formatTicketDate(value: Date): string {
  const pad = (part: number) => part.toString().padStart(2, "0");

  return [
    `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear().toString().slice(-2)}`,
    `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`,
  ].join(" ");
}

function separator(strong = false): string {
  return (strong ? "=" : "-").repeat(TICKET_COLUMNS);
}

function wrapText(value: string, width = TICKET_COLUMNS): string[] {
  const words = sanitizeTicketText(value.toUpperCase()).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word.slice(0, width);
      continue;
    }

    if (current.length + 1 + word.length <= width) {
      current = `${current} ${word}`;
      continue;
    }

    lines.push(current);
    current = word.slice(0, width);
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function formatContext(ticket: KitchenTicketRecord): string | null {
  if (ticket.tableName) return `TABLE ${ticket.tableName}`;
  if (ticket.deliveryCustomerName && ticket.deliveryAddress) {
    return `${ticket.deliveryCustomerName} - ${ticket.deliveryAddress}`;
  }
  if (ticket.deliveryCustomerName) return ticket.deliveryCustomerName;
  if (ticket.deliveryAddress) return ticket.deliveryAddress;
  return null;
}

export function buildKitchenTicketEscPos(
  ticket: KitchenTicketRecord,
  options: Pick<KitchenTicketPrinterOptions, "printedAt"> = {},
): Buffer {
  const printedAt = options.printedAt ?? new Date();
  const context = formatContext(ticket);
  const lines: string[] = [
    ESC + "@",
    ESC + "a" + "\x01",
    "KITCHEN",
    ESC + "!" + "\x30",
    `#${ticket.queueNumber}`,
    ESC + "!" + "\x00",
    ticket.orderNumber,
    formatOrderTypeLabel(ticket.orderType),
  ];

  if (context) lines.push(...wrapText(context));

  lines.push(`PRINT: ${formatTicketDate(printedAt)}`, ESC + "a" + "\x00", separator(true));

  for (const item of ticket.items) {
    lines.push(...wrapText(`${item.quantity}X ${item.name}`));

    for (const option of item.options) {
      lines.push(...wrapText(`* ${option.groupName}: ${option.valueName}`));
    }

    if (item.notes) lines.push(...wrapText(`NOTE: ${item.notes}`));
    lines.push(separator());
  }

  lines.push("", "", "", GS + "V" + "\x00");

  return Buffer.from(lines.join("\n"), "latin1");
}

function thermerText(
  content: string,
  options: Partial<Pick<ThermerTextEntry, "bold" | "align" | "format">> = {},
): ThermerTextEntry {
  return {
    type: 0,
    content,
    bold: options.bold ?? 0,
    align: options.align ?? 0,
    format: options.format ?? 0,
  };
}

export function buildKitchenTicketThermerPayload(
  ticket: KitchenTicketRecord,
  options: Pick<KitchenTicketPrinterOptions, "printedAt"> = {},
): ThermerTextEntry[] {
  const receipt = buildKitchenTicketEscPos(ticket, options).toString("latin1");
  const entries: ThermerTextEntry[] = [];
  let align: 0 | 1 | 2 = 0;
  let format: ThermerTextEntry["format"] = 0;
  let bold: 0 | 1 = 0;

  for (const rawLine of receipt.split("\n")) {
    if (rawLine === ESC + "a" + "\x01") {
      align = 1;
      continue;
    }
    if (rawLine === ESC + "a" + "\x00") {
      align = 0;
      continue;
    }
    if (rawLine === ESC + "!" + "\x30") {
      format = 2;
      bold = 1;
      continue;
    }
    if (rawLine === ESC + "!" + "\x00") {
      format = 0;
      bold = 0;
      continue;
    }
    if (rawLine === ESC + "@" || rawLine === GS + "V" + "\x00") continue;

    const line = sanitizeTicketText(rawLine);
    entries.push(thermerText(line || " ", { align, bold, format }));
  }

  if (entries[0]) {
    entries[0] = thermerText(entries[0].content, { align: 1, bold: 1, format: 3 });
  }

  return entries;
}

export async function printKitchenTicketToSystemPrinter(
  ticket: KitchenTicketRecord,
  options: KitchenTicketPrinterOptions = {},
): Promise<void> {
  const printerName = getKitchenPrinterName(options.env);
  const receipt = buildKitchenTicketEscPos(ticket, options);
  const spawn = options.spawn ?? spawnChildProcess;

  await new Promise<void>((resolve, reject) => {
    const child = spawn("lp", ["-d", printerName, "-o", "raw"]);

    child.stdin.write(receipt, (error) => {
      if (error) {
        reject(error);
        return;
      }
      child.stdin.end();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Kitchen printer exited with code ${code ?? "unknown"}.`));
    });
  });
}
