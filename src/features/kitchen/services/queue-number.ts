import type { Prisma } from "@prisma/client";

const STORE_TIME_ZONE = "Asia/Jakarta";

export function getQueueBusinessDate(date: Date, timeZone = STORE_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`;
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
