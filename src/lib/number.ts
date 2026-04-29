export function toDecimalString(value: unknown, fallback = "0"): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }

  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return value.trim();
  }

  return fallback;
}

export function toOptionalDecimalString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const decimal = toDecimalString(value, "");
  return decimal === "" ? null : decimal;
}

export function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

export function toInteger(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return Number(value);
  }

  return fallback;
}

export function sanitizeDecimalInput(value: string): string {
  const digitsAndDots = value.replace(/[^\d.]/g, "");
  const [wholePart, ...decimalParts] = digitsAndDots.split(".");
  const decimalPart = decimalParts.join("");

  return decimalParts.length > 0 ? `${wholePart}.${decimalPart}` : wholePart;
}
