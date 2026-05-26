import { spawn as spawnChildProcess } from "node:child_process";
import type { SettingsRecord } from "@/features/catalog/types";
import type { CheckoutOrderRecord } from "@/features/checkout/types";

type Spawn = typeof spawnChildProcess;
type ReceiptPrinterEnv = {
  POS_RECEIPT_PRINTER?: string;
};

const ESC = "\x1b";
const GS = "\x1d";
const RECEIPT_COLUMNS = 32;
const DEFAULT_RECEIPT_PRINTER = "_58Printer";

export interface ReceiptPrinterOptions {
  env?: ReceiptPrinterEnv;
  printedAt?: Date;
  spawn?: Spawn;
}

function sanitizeReceiptText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatReceiptAmount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatReceiptDate(value: Date): string {
  const pad = (part: number) => part.toString().padStart(2, "0");

  return [
    `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear().toString().slice(-2)}`,
    `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`,
  ].join(" ");
}

function formatReceiptOrderType(orderType: CheckoutOrderRecord["orderType"]): string {
  if (orderType === "dine_in") return "DINE-IN";
  if (orderType === "delivery") return "DELIVERY";
  return "TAKE-AWAY";
}

function centerLine(value: string): string {
  return sanitizeReceiptText(value.toUpperCase()).slice(0, RECEIPT_COLUMNS);
}

function separator(strong = false): string {
  return (strong ? "=" : "-").repeat(RECEIPT_COLUMNS);
}

function wrapText(value: string, width = RECEIPT_COLUMNS): string[] {
  const words = sanitizeReceiptText(value.toUpperCase()).split(" ").filter(Boolean);
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

function columns(left: string, right: string, width = RECEIPT_COLUMNS): string {
  const cleanLeft = sanitizeReceiptText(left.toUpperCase());
  const cleanRight = sanitizeReceiptText(right.toUpperCase());
  const availableLeft = Math.max(width - cleanRight.length - 1, 1);
  const trimmedLeft = cleanLeft.slice(0, availableLeft);

  return `${trimmedLeft}${" ".repeat(Math.max(width - trimmedLeft.length - cleanRight.length, 1))}${cleanRight}`;
}

function itemLine(name: string, quantity: number, unitPrice: number, lineTotal: number): string[] {
  const amount = formatReceiptAmount(lineTotal);
  const prefix = `${quantity}X ${formatReceiptAmount(unitPrice)}`;
  const nameWidth = Math.max(RECEIPT_COLUMNS - amount.length - 1, 12);
  const lines = wrapText(name, nameWidth);

  return lines.map((line, index) => {
    if (index === 0) return columns(`${line} ${prefix}`, amount);
    return line;
  });
}

export function getReceiptPrinterName(
  env: ReceiptPrinterEnv = { POS_RECEIPT_PRINTER: process.env.POS_RECEIPT_PRINTER },
): string {
  const printerName = env.POS_RECEIPT_PRINTER?.trim() || DEFAULT_RECEIPT_PRINTER;

  if (!/^[A-Za-z0-9_.-]+$/.test(printerName)) {
    throw new Error("Printer name contains unsupported characters.");
  }

  return printerName;
}

export function buildReceiptEscPos(
  order: CheckoutOrderRecord,
  settings: SettingsRecord | null,
  options: Pick<ReceiptPrinterOptions, "printedAt"> = {},
): Buffer {
  const paidAt = order.paidAt ? new Date(order.paidAt) : null;
  const printedAt = options.printedAt ?? new Date();
  const paymentMethod = order.payment?.method === "qris" ? "QRIS" : "TUNAI";
  const lines: string[] = [
    ESC + "@",
    ESC + "a" + "\x01",
    centerLine(settings?.storeName ?? "Maza Cafe"),
  ];

  if (settings?.storeAddress) lines.push(centerLine(settings.storeAddress));
  if (settings?.storePhone) lines.push(centerLine(settings.storePhone));

  lines.push(
    ESC + "a" + "\x00",
    separator(true),
    `BILL: ${order.orderNumber}`,
    `TYPE: ${formatReceiptOrderType(order.orderType)}`,
  );

  if (order.tableName) lines.push(`TABLE: ${sanitizeReceiptText(order.tableName.toUpperCase())}`);
  if (order.deliveryCustomerName) {
    lines.push(`CUSTOMER: ${sanitizeReceiptText(order.deliveryCustomerName.toUpperCase())}`);
  }

  lines.push(
    `POS:1|CSH:${sanitizeReceiptText((order.cashierName ?? "-").toUpperCase())}`,
    `PAID: ${paidAt ? formatReceiptDate(paidAt) : "-"}`,
    `PRINT TIME: ${formatReceiptDate(printedAt)}`,
    separator(true),
  );

  for (const item of order.items) {
    const itemName = [item.productNameSnapshot, item.variantNameSnapshot]
      .filter(Boolean)
      .join(" / ");
    lines.push(...itemLine(itemName, item.quantity, item.unitPrice, item.lineTotal));

    if (item.discountAmount > 0) {
      lines.push(columns("* DISCOUNT", `-${formatReceiptAmount(item.discountAmount)}`));
    }

    for (const selection of item.optionSelections) {
      lines.push(
        ...wrapText(`* ${selection.groupNameSnapshot}: ${selection.valueNameSnapshot}`),
      );
    }

    if (item.notes) lines.push(...wrapText(`* ${item.notes}`));
  }

  lines.push(
    separator(true),
    columns("SUB TOTAL", formatReceiptAmount(order.subtotalAmount)),
  );

  if (order.discountAmount > 0) {
    lines.push(columns("DISCOUNT", `-${formatReceiptAmount(order.discountAmount)}`));
  }
  if (order.serviceChargeAmount > 0) {
    lines.push(columns("SERVICE", formatReceiptAmount(order.serviceChargeAmount)));
  }

  lines.push(separator(), columns("TOTAL", formatReceiptAmount(order.totalAmount)));

  if (order.taxAmount > 0) {
    lines.push(
      separator(),
      "HARGA SUDAH TERMASUK PAJAK",
      columns("PB1", formatReceiptAmount(order.taxAmount)),
    );
  }

  lines.push(
    separator(),
    "PEMBAYARAN",
    columns(`- ${paymentMethod}`, formatReceiptAmount(order.payment?.amount ?? order.totalAmount)),
  );

  if (order.payment?.method === "cash") {
    lines.push(
      columns(
        "TUNAI",
        formatReceiptAmount(
          order.payment.cashReceivedAmount ?? order.payment.amount ?? order.totalAmount,
        ),
      ),
      columns("KEMBALIAN", formatReceiptAmount(order.payment.changeAmount ?? 0)),
    );
  }

  lines.push(separator(true));

  if (order.queueNumber) {
    lines.push(
      "",
      ESC + "a" + "\x01",
      "NO PANGGIL:",
      ESC + "!" + "\x30",
      String(order.queueNumber),
      ESC + "!" + "\x00",
      ESC + "a" + "\x00",
      "",
    );
  }

  if (settings?.receiptFooter) {
    lines.push(separator(true), ESC + "a" + "\x01", ...wrapText(settings.receiptFooter), ESC + "a" + "\x00");
  }

  lines.push("", "", "", GS + "V" + "\x00");

  return Buffer.from(lines.join("\n"), "latin1");
}

export async function printReceiptToSystemPrinter(
  order: CheckoutOrderRecord,
  settings: SettingsRecord | null,
  options: ReceiptPrinterOptions = {},
): Promise<void> {
  const printerName = getReceiptPrinterName(options.env);
  const receipt = buildReceiptEscPos(order, settings, options);
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

      reject(new Error(`Receipt printer exited with code ${code ?? "unknown"}.`));
    });
  });
}
