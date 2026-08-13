import { spawn as spawnChildProcess } from "node:child_process";
import {
  getReceiptPrinterName,
  type ThermerTextEntry,
} from "@/features/checkout/services/receipt-printer";
import type {
  KitchenTicketItemRecord,
  KitchenTicketRecord,
} from "@/features/kitchen/types";

type Spawn = typeof spawnChildProcess;

const ESC = "\x1b";

/**
 * A 58mm head prints 384 dots at 203dpi: 32 columns of 12-dot characters,
 * covering 48mm of the 50mm label. Using every column keeps the leftover 1mm
 * split evenly down both edges instead of pooling on the right.
 */
const LABEL_COLUMNS = 32;

/**
 * 30mm of label is 240 dots, exactly 10 lines of 24-dot text, so content fills
 * the sticker and the footer lands on the bottom edge. Only the die-cut gap is
 * fed through afterwards.
 */
const LABEL_CONTENT_LINES = 10;
const LINE_DOTS = 24;

/**
 * One 30mm label plus a ~3mm die-cut gap. The printer has no gap sensor, so
 * this pitch is what keeps successive labels registered - calibrate it per
 * roll through labelPitchDots when the stock changes.
 */
const DEFAULT_LABEL_PITCH_DOTS = 264;

/**
 * A free-text note can be arbitrarily long. Past this many labels for a single
 * item the tail is trimmed rather than spooling the whole roll.
 */
const MAX_PARTS_PER_UNIT = 4;

const HEADER_LINES = 1;
const NAME_LINES = 2;
const FOOTER_LINES = 1;
const BODY_LINES =
  LABEL_CONTENT_LINES - HEADER_LINES - NAME_LINES - FOOTER_LINES;

export interface OrderLabelPrinterOptions {
  env?: {
    POS_LABEL_PRINTER?: string;
    POS_KITCHEN_PRINTER?: string;
    POS_RECEIPT_PRINTER?: string;
  };
  printedAt?: Date;
  labelPitchDots?: number;
  spawn?: Spawn;
}

/** One rendered line and whether it occupies two 24-dot slots. */
export interface LabelLine {
  text: string;
  doubleHeight: boolean;
}

/** One physical product that needs its own sticker. */
interface LabelUnit {
  item: KitchenTicketItemRecord;
  index: number;
}

function sanitizeLabelText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Label lines are composed with deliberate column padding, so they must not be
 * run back through sanitizeLabelText - collapsing whitespace would destroy the
 * alignment of the header and footer.
 */
function stripControlCharacters(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, "").trimEnd();
}

function wrapText(value: string, width = LABEL_COLUMNS): string[] {
  const words = sanitizeLabelText(value).split(" ").filter(Boolean);
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
  return lines;
}

function columns(left: string, right: string, width = LABEL_COLUMNS): string {
  const trimmedLeft = left.slice(0, Math.max(width - right.length - 1, 1));
  const gap = Math.max(width - trimmedLeft.length - right.length, 1);

  return `${trimmedLeft}${" ".repeat(gap)}${right}`;
}

/** Queue number left, order reference centred, order type right. */
function headerLine(left: string, center: string, right: string): string {
  const available = LABEL_COLUMNS - left.length - right.length;
  if (available < center.length + 2) return columns(left, right);

  const leading = Math.floor((available - center.length) / 2);
  const trailing = available - center.length - leading;

  return `${left}${" ".repeat(leading)}${center}${" ".repeat(trailing)}${right}`;
}

function formatLabelOrderType(
  orderType: KitchenTicketRecord["orderType"],
): string {
  if (orderType === "dine_in") return "DIN";
  if (orderType === "delivery") return "DEL";
  return "TKA";
}

/**
 * Order numbers are POS-YYYYMMDD-HHMMSS-XXXX, far too wide for the header. The
 * trailing time and random suffix stay unique in practice and remain greppable
 * against the full number.
 */
function shortOrderNumber(orderNumber: string): string {
  const segments = sanitizeLabelText(orderNumber).split("-").filter(Boolean);
  if (segments.length <= 2) return segments.join("-");

  return segments.slice(-2).join("-");
}

function formatLabelTime(value: Date): string {
  const pad = (part: number) => part.toString().padStart(2, "0");

  return `${pad(value.getDate())}/${pad(value.getMonth() + 1)} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function expandUnits(items: KitchenTicketItemRecord[]): LabelUnit[] {
  const units: LabelUnit[] = [];

  for (const item of items) {
    const quantity = Math.max(1, Math.trunc(item.quantity));

    for (let copy = 0; copy < quantity; copy += 1) {
      units.push({ item, index: units.length + 1 });
    }
  }

  return units;
}

/**
 * Option values carry the meaning without their group name - a barista reads
 * "NO SUGAR" the same as "LESS/NO SUGAR: NO SUGAR" - so values are joined
 * inline to spend as few of the four body lines as possible.
 */
function buildBodyLines(item: KitchenTicketItemRecord): string[] {
  const lines: string[] = [];
  const variants = item.options
    .map((option) => sanitizeLabelText(option.valueName))
    .filter(Boolean);

  if (variants.length > 0) lines.push(...wrapText(variants.join(", ")));
  if (item.notes) lines.push(...wrapText(`NOTE: ${item.notes}`));

  return lines;
}

function chunkBodyLines(lines: string[]): string[][] {
  if (lines.length === 0) return [[]];

  const parts: string[][] = [];
  for (let start = 0; start < lines.length; start += BODY_LINES) {
    parts.push(lines.slice(start, start + BODY_LINES));
  }

  if (parts.length <= MAX_PARTS_PER_UNIT) return parts;

  const kept = parts.slice(0, MAX_PARTS_PER_UNIT);
  const lastPart = kept[kept.length - 1];
  const lastLine = lastPart[lastPart.length - 1] ?? "";
  kept[kept.length - 1] = [
    ...lastPart.slice(0, -1),
    `${lastLine.slice(0, LABEL_COLUMNS - 3)}...`,
  ];

  return kept;
}

/**
 * A name that fits on one line is printed double height for readability across
 * the counter. A longer one drops to normal height over two lines rather than
 * being truncated, which costs the same two slots either way.
 */
function buildNameLines(name: string, marker: string): LabelLine[] {
  const width = marker ? LABEL_COLUMNS - marker.length - 1 : LABEL_COLUMNS;
  const clean = sanitizeLabelText(name);

  if (clean.length <= width) {
    return [
      { text: marker ? columns(clean, marker) : clean, doubleHeight: true },
    ];
  }

  const wrapped = wrapText(clean, width).slice(0, NAME_LINES);

  return wrapped.map((line, index) => ({
    text: index === 0 && marker ? columns(line, marker) : line,
    doubleHeight: false,
  }));
}

function countSlots(lines: LabelLine[]): number {
  return lines.reduce((total, line) => total + (line.doubleHeight ? 2 : 1), 0);
}

/**
 * Builds every label for one physical product. More than one is returned only
 * when the variants and note overflow a single sticker.
 */
function buildUnitLabels(
  ticket: KitchenTicketRecord,
  unit: LabelUnit,
  totalUnits: number,
  printedAt: Date,
): LabelLine[][] {
  const bodyParts = chunkBodyLines(buildBodyLines(unit.item));
  const header = headerLine(
    String(ticket.queueNumber).padStart(3, "0"),
    shortOrderNumber(ticket.orderNumber),
    formatLabelOrderType(ticket.orderType),
  );
  const footer = columns(
    formatLabelTime(printedAt),
    `${unit.index}/${totalUnits}`,
  );

  return bodyParts.map((body, partIndex) => {
    const marker =
      bodyParts.length > 1 ? `(${partIndex + 1}/${bodyParts.length})` : "";
    const lines: LabelLine[] = [
      { text: header, doubleHeight: false },
      ...buildNameLines(unit.item.name, marker),
      ...body.map((text) => ({ text, doubleHeight: false })),
    ];

    const padding = Math.max(
      LABEL_CONTENT_LINES - countSlots(lines) - FOOTER_LINES,
      0,
    );
    for (let blank = 0; blank < padding; blank += 1) {
      lines.push({ text: "", doubleHeight: false });
    }

    lines.push({ text: footer, doubleHeight: false });
    return lines;
  });
}

export function buildOrderLabels(
  ticket: KitchenTicketRecord,
  options: Pick<OrderLabelPrinterOptions, "printedAt"> = {},
): LabelLine[][] {
  const printedAt = options.printedAt ?? new Date();
  const units = expandUnits(ticket.items);

  return units.flatMap((unit) =>
    buildUnitLabels(ticket, unit, units.length, printedAt),
  );
}

export function getLabelPrinterName(
  env: OrderLabelPrinterOptions["env"],
): string {
  const printerName =
    env?.POS_LABEL_PRINTER?.trim() ||
    env?.POS_KITCHEN_PRINTER?.trim() ||
    env?.POS_RECEIPT_PRINTER?.trim() ||
    process.env.POS_LABEL_PRINTER?.trim() ||
    process.env.POS_KITCHEN_PRINTER?.trim() ||
    process.env.POS_RECEIPT_PRINTER;

  return getReceiptPrinterName({ POS_RECEIPT_PRINTER: printerName });
}

/**
 * Labels are die-cut and peeled, never cut, so no cut command is emitted. Line
 * spacing is pinned to 24 dots so the eight content lines always measure the
 * same height and the trailing feed lands on the next label edge.
 */
export function buildOrderLabelsEscPos(
  ticket: KitchenTicketRecord,
  options: Pick<OrderLabelPrinterOptions, "printedAt" | "labelPitchDots"> = {},
): Buffer {
  const pitchDots = options.labelPitchDots ?? DEFAULT_LABEL_PITCH_DOTS;
  const feedDots = Math.min(
    Math.max(pitchDots - LABEL_CONTENT_LINES * LINE_DOTS, 0),
    255,
  );

  let output = `${ESC}@${ESC}3${String.fromCharCode(LINE_DOTS)}`;

  for (const label of buildOrderLabels(ticket, options)) {
    for (const line of label) {
      if (line.doubleHeight) {
        output += `${ESC}3${String.fromCharCode(LINE_DOTS * 2)}`;
        output += `${ESC}!\x10${line.text}\n`;
        output += `${ESC}!\x00${ESC}3${String.fromCharCode(LINE_DOTS)}`;
        continue;
      }

      output += `${line.text}\n`;
    }

    output += `${ESC}J${String.fromCharCode(feedDots)}`;
  }

  return Buffer.from(output, "latin1");
}

/**
 * Built from the same line model as the ESC/POS output rather than by parsing
 * it back, so column padding survives. Thermer has no dot-level feed, so the
 * inter-label gap is approximated with blank lines.
 */
export function buildOrderLabelsThermerPayload(
  ticket: KitchenTicketRecord,
  options: Pick<OrderLabelPrinterOptions, "printedAt" | "labelPitchDots"> = {},
): ThermerTextEntry[] {
  const pitchDots = options.labelPitchDots ?? DEFAULT_LABEL_PITCH_DOTS;
  const gapLines = Math.max(
    Math.round((pitchDots - LABEL_CONTENT_LINES * LINE_DOTS) / LINE_DOTS),
    0,
  );
  const entries: ThermerTextEntry[] = [];

  for (const label of buildOrderLabels(ticket, options)) {
    for (const line of label) {
      const text = stripControlCharacters(line.text);
      entries.push({
        type: 0,
        content: text || " ",
        // Thermer's enlarged formats are double width as well as height, which
        // would overflow 30 columns, so emphasis is carried by bold alone.
        bold: line.doubleHeight ? 1 : 0,
        align: 0,
        format: 0,
      });
    }

    for (let blank = 0; blank < gapLines; blank += 1) {
      entries.push({ type: 0, content: " ", bold: 0, align: 0, format: 0 });
    }
  }

  return entries;
}

export async function printOrderLabelsToSystemPrinter(
  ticket: KitchenTicketRecord,
  options: OrderLabelPrinterOptions = {},
): Promise<void> {
  const printerName = getLabelPrinterName(options.env);
  const labels = buildOrderLabelsEscPos(ticket, options);
  const spawn = options.spawn ?? spawnChildProcess;

  await new Promise<void>((resolve, reject) => {
    const child = spawn("lp", ["-d", printerName, "-o", "raw"]);

    child.stdin.write(labels, (error) => {
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

      reject(new Error(`Label printer exited with code ${code ?? "unknown"}.`));
    });
  });
}
