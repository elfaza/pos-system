export function formatCurrencyInput(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return "";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function parseCurrencyInput(value: string): string {
  const isNegative = value.trim().startsWith("-");
  const digits = value.replace(/\D/g, "");
  if (!digits) return isNegative ? "-" : "";

  return `${isNegative ? "-" : ""}${Number(digits)}`;
}
