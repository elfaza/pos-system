import type { CartItem, CartTotals, CheckoutSettings } from "../types";

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateCartTotals(
  items: CartItem[],
  settings: CheckoutSettings,
): CartTotals {
  const subtotalAmount = roundCurrency(
    items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
  );
  const discountAmount = roundCurrency(
    items.reduce((total, item) => total + item.discountAmount, 0),
  );
  const taxableBase = Math.max(subtotalAmount - discountAmount, 0);
  const serviceChargeAmount = settings.serviceChargeEnabled
    ? roundCurrency(taxableBase * (settings.serviceChargeRate / 100))
    : 0;
  const taxAmount = settings.taxEnabled
    ? roundCurrency(taxableBase * (settings.taxRate / 100))
    : 0;

  return {
    subtotalAmount,
    discountAmount,
    serviceChargeAmount,
    taxAmount,
    totalAmount: roundCurrency(
      taxableBase + serviceChargeAmount + taxAmount,
    ),
  };
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
