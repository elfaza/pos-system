import type { Prisma } from "@prisma/client";

const STORE_TIME_ZONE = "Asia/Jakarta";
const BUSINESS_DAY_START_TIME = "00:00";

function parseLocalDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(byType.get("year")),
    month: Number(byType.get("month")),
    day: Number(byType.get("day")),
    hour: Number(byType.get("hour")),
    minute: Number(byType.get("minute")),
  };
}

function formatBusinessDate(parts: { year: number; month: number; day: number }) {
  return [
    parts.year.toString().padStart(4, "0"),
    parts.month.toString().padStart(2, "0"),
    parts.day.toString().padStart(2, "0"),
  ].join("-");
}

function previousCalendarDate(parts: { year: number; month: number; day: number }) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  date.setUTCDate(date.getUTCDate() - 1);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function parseStartMinutes(businessDayStartTime: string) {
  const [hour, minute] = businessDayStartTime.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return 0;
  return hour * 60 + minute;
}

export function getQueueBusinessDate(
  date: Date,
  timeZone = STORE_TIME_ZONE,
  businessDayStartTime = BUSINESS_DAY_START_TIME,
) {
  const parts = parseLocalDateParts(date, timeZone);
  const localMinutes = parts.hour * 60 + parts.minute;
  const startMinutes = parseStartMinutes(businessDayStartTime);
  const businessDateParts =
    localMinutes < startMinutes ? previousCalendarDate(parts) : parts;

  return formatBusinessDate(businessDateParts);
}

export async function getNextQueueNumber(
  tx: Prisma.TransactionClient,
  queueBusinessDate: string,
) {
  const result = await tx.order.aggregate({
    where: { queueBusinessDate },
    _max: { queueNumber: true },
  });

  return (result._max.queueNumber ?? 0) + 1;
}
