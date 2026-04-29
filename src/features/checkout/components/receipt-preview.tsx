"use client";

import type { SettingsRecord } from "@/features/catalog/types";
import { formatRupiah } from "@/features/checkout/services/checkout-calculations";
import type { CheckoutOrderRecord } from "@/features/checkout/types";

export default function ReceiptPreview({
  order,
  settings,
  onClose,
}: {
  order: CheckoutOrderRecord;
  settings: SettingsRecord | null;
  onClose?: () => void;
}) {
  const paidAt = order.paidAt ? new Date(order.paidAt) : null;

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-start justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-lg font-semibold">Receipt Preview</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {order.orderNumber}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="h-10 rounded-md bg-[var(--primary)] px-3 font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
          >
            Print
          </button>
          {onClose ? (
            <button
              onClick={onClose}
              className="h-10 rounded-md border border-[var(--border)] px-3 font-medium hover:bg-[var(--muted)]"
            >
              Close
            </button>
          ) : null}
        </div>
      </div>

      <div className="mx-auto mt-4 max-w-sm rounded-md border border-dashed border-[var(--border)] bg-white p-4 text-sm text-black print:mt-0 print:border-0">
        <div className="text-center">
          <h3 className="font-semibold">{settings?.storeName ?? "Maza Cafe"}</h3>
          {settings?.storeAddress ? (
            <p className="mt-1 text-xs">{settings.storeAddress}</p>
          ) : null}
          {settings?.storePhone ? (
            <p className="text-xs">{settings.storePhone}</p>
          ) : null}
        </div>

        <div className="my-3 border-t border-dashed border-gray-400" />

        <div className="grid gap-1 text-xs">
          <div className="flex justify-between gap-3">
            <span>Order</span>
            <span>{order.orderNumber}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Cashier</span>
            <span>{order.cashierName ?? "-"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Paid</span>
            <span>{paidAt ? paidAt.toLocaleString() : "-"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Payment</span>
            <span>{order.payment?.method ? order.payment.method.toUpperCase() : "-"}</span>
          </div>
        </div>

        <div className="my-3 border-t border-dashed border-gray-400" />

        <div className="grid gap-2">
          {order.items.map((item) => (
            <div key={item.id}>
              <div className="flex justify-between gap-3">
                <span className="font-medium">
                  {item.productNameSnapshot}
                  {item.variantNameSnapshot ? ` / ${item.variantNameSnapshot}` : ""}
                </span>
                <span>{formatRupiah(item.lineTotal)}</span>
              </div>
              <div className="text-xs text-gray-600">
                {item.quantity} x {formatRupiah(item.unitPrice)}
                {item.discountAmount > 0
                  ? ` - discount ${formatRupiah(item.discountAmount)}`
                  : ""}
              </div>
              {item.notes ? (
                <div className="text-xs text-gray-600">Note: {item.notes}</div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="my-3 border-t border-dashed border-gray-400" />

        <div className="grid gap-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatRupiah(order.subtotalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <span>{formatRupiah(order.discountAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Service</span>
            <span>{formatRupiah(order.serviceChargeAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{formatRupiah(order.taxAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-dashed border-gray-400 pt-2 font-semibold">
            <span>Total</span>
            <span>{formatRupiah(order.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment amount</span>
            <span>{formatRupiah(order.payment?.amount ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>Cash received</span>
            <span>{formatRupiah(order.payment?.cashReceivedAmount ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>Change</span>
            <span>{formatRupiah(order.payment?.changeAmount ?? 0)}</span>
          </div>
        </div>

        {settings?.receiptFooter ? (
          <>
            <div className="my-3 border-t border-dashed border-gray-400" />
            <p className="text-center text-xs">{settings.receiptFooter}</p>
          </>
        ) : null}
      </div>
    </div>
  );
}
