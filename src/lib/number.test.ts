import { describe, expect, it } from "vitest";
import {
  toBoolean,
  toDecimalString,
  toInteger,
  toOptionalDecimalString,
} from "./number";

describe("number utilities", () => {
  it("normalizes decimal values and falls back for invalid input", () => {
    expect(toDecimalString(12.5)).toBe("12.5");
    expect(toDecimalString(" 99.95 ")).toBe("99.95");
    expect(toDecimalString("abc", "0")).toBe("0");
    expect(toDecimalString("", "fallback")).toBe("fallback");
  });

  it("returns null for optional decimal blanks and invalid values", () => {
    expect(toOptionalDecimalString(null)).toBeNull();
    expect(toOptionalDecimalString("")).toBeNull();
    expect(toOptionalDecimalString("15")).toBe("15");
    expect(toOptionalDecimalString("not-a-number")).toBeNull();
  });

  it("keeps boolean parsing strict", () => {
    expect(toBoolean(true)).toBe(true);
    expect(toBoolean(false, true)).toBe(false);
    expect(toBoolean("true", false)).toBe(false);
  });

  it("parses only integer values", () => {
    expect(toInteger(4)).toBe(4);
    expect(toInteger("-7")).toBe(-7);
    expect(toInteger("4.5", 1)).toBe(1);
    expect(toInteger(4.5, 1)).toBe(1);
  });
});
