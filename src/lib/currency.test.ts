import { describe, expect, it } from "vitest";
import { formatCurrencyInput, parseCurrencyInput } from "./currency";

describe("currency input helpers", () => {
  it("formats IDR values for form display", () => {
    expect(formatCurrencyInput(10000)).toMatch(/^Rp\s?10\.000$/u);
    expect(formatCurrencyInput("25000")).toMatch(/^Rp\s?25\.000$/u);
    expect(formatCurrencyInput("")).toBe("");
  });

  it("parses formatted IDR values back to numeric strings", () => {
    expect(parseCurrencyInput("Rp 10.000")).toBe("10000");
    expect(parseCurrencyInput("25,000")).toBe("25000");
    expect(parseCurrencyInput("-Rp 5.000")).toBe("-5000");
  });
});
