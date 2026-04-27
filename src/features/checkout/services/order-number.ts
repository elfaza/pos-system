export function createOrderNumber(now = new Date()): string {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .replaceAll("-", "");
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(now)
    .replaceAll(":", "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `POS-${date}-${time}-${suffix}`;
}
