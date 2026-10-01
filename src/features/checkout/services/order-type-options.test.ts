import { describe, expect, it } from "vitest";
import { formatOrderTypeLabel, orderTypeOptions } from "./order-type-options";

describe("order type options", () => {
  it("offers dine-in, take-away, and delivery in cashier order", () => {
    expect(orderTypeOptions).toEqual([
      { value: "dine_in", label: "Dine-in" },
      { value: "takeaway", label: "Take-away" },
      { value: "delivery", label: "Delivery" },
    ]);
  });

  it("formats every supported order type", () => {
    expect(formatOrderTypeLabel("dine_in")).toBe("Dine-in");
    expect(formatOrderTypeLabel("takeaway")).toBe("Take-away");
    expect(formatOrderTypeLabel("delivery")).toBe("Delivery");
    expect(formatOrderTypeLabel(null)).toBe("-");
  });
});
