import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CheckoutOrderRecord } from "@/features/checkout/types";
import ReceiptPreview from "./receipt-preview";

const order: CheckoutOrderRecord = {
  id: "order-1",
  orderNumber: "POS-20260919-161609-MYF8",
  orderType: "takeaway",
  tableId: null,
  tableName: null,
  deliveryCustomerName: null,
  deliveryCustomerPhone: null,
  deliveryAddress: null,
  deliveryNotes: null,
  cashierName: "Arya Kasir",
  cashierEmail: "cashier@pos.local",
  status: "paid",
  queueBusinessDate: "2026-09-19",
  queueNumber: 3,
  kitchenStatus: "received",
  kitchenPreparingAt: null,
  kitchenReadyAt: null,
  kitchenCompletedAt: null,
  subtotalAmount: 25000,
  discountAmount: 0,
  taxAmount: 0,
  serviceChargeAmount: 0,
  totalAmount: 25000,
  heldAt: null,
  paidAt: "2026-09-19T16:16:09.000Z",
  createdAt: "2026-09-19T16:15:00.000Z",
  items: [
    {
      id: "item-1",
      productId: "product-1",
      variantId: null,
      productNameSnapshot: "Nasi Ayam Sambal Matah Extra Pedas",
      variantNameSnapshot: null,
      quantity: 1,
      unitPrice: 25000,
      discountAmount: 0,
      lineTotal: 25000,
      notes: null,
      optionSelections: [],
    },
  ],
  payment: {
    id: "payment-1",
    method: "qris",
    status: "paid",
    amount: 25000,
    cashReceivedAmount: null,
    changeAmount: null,
    paidAt: "2026-09-19T16:16:09.000Z",
  },
};

describe("ReceiptPreview", () => {
  it("wraps the complete menu name instead of truncating it", () => {
    const markup = renderToStaticMarkup(
      <ReceiptPreview order={order} settings={null} />,
    );

    expect(markup).toContain("Nasi Ayam Sambal Matah Extra Pedas");
    expect(markup).toContain("break-words");
    expect(markup).not.toContain("truncate");
  });
});
