import { describe, expect, it } from "vitest";
import { calculateCartTotals, formatRupiah } from "./checkout-calculations";
import type { CartItem, CheckoutSettings } from "../types";

const settings: CheckoutSettings = {
  taxEnabled: true,
  taxRate: 11,
  serviceChargeEnabled: true,
  serviceChargeRate: 5,
};

function item(overrides: Partial<CartItem>): CartItem {
  return {
    id: "product-1:base",
    productId: "product-1",
    variantId: null,
    productName: "Coffee",
    variantName: null,
    categoryName: "Drinks",
    unitPrice: 10_000,
    quantity: 1,
    discountAmount: 0,
    notes: "",
    trackStock: false,
    stockQuantity: null,
    ...overrides,
  };
}

describe("calculateCartTotals", () => {
  it("calculates subtotal, discounts, service charge, tax, and total", () => {
    expect(
      calculateCartTotals(
        [
          item({ unitPrice: 10_000, quantity: 2, discountAmount: 1_000 }),
          item({ id: "product-2:base", productId: "product-2", unitPrice: 5_000 }),
        ],
        settings,
      ),
    ).toEqual({
      subtotalAmount: 25_000,
      discountAmount: 1_000,
      serviceChargeAmount: 1_200,
      taxAmount: 2_640,
      totalAmount: 27_840,
    });
  });

  it("returns zero totals for an empty cart", () => {
    expect(calculateCartTotals([], settings)).toEqual({
      subtotalAmount: 0,
      discountAmount: 0,
      serviceChargeAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
    });
  });

  it("does not allow discounts to create negative taxable totals", () => {
    expect(
      calculateCartTotals([item({ unitPrice: 10_000, discountAmount: 20_000 })], settings),
    ).toMatchObject({
      subtotalAmount: 10_000,
      discountAmount: 20_000,
      serviceChargeAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
    });
  });

  it("rounds currency calculations to two decimal places", () => {
    expect(
      calculateCartTotals(
        [item({ unitPrice: 100.005, quantity: 1 })],
        {
          taxEnabled: true,
          taxRate: 10,
          serviceChargeEnabled: false,
          serviceChargeRate: 0,
        },
      ),
    ).toMatchObject({
      subtotalAmount: 100.01,
      taxAmount: 10,
      totalAmount: 110.01,
    });
  });
});

describe("formatRupiah", () => {
  it("formats values as Indonesian rupiah", () => {
    expect(formatRupiah(12_500)).toMatch(/^Rp\s?12\.500$/u);
  });
});
