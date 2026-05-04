"use client";

import { useEffect, useRef } from "react";
import type { SettingsRecord } from "@/features/catalog/types";
import type { CheckoutOrderRecord } from "@/features/checkout/types";

function formatReceiptAmount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatReceiptDate(value: Date): string {
  const pad = (part: number) => part.toString().padStart(2, "0");

  return [
    `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear().toString().slice(-2)}`,
    `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`,
  ].join(" ");
}

function Separator({ strong = false }: { strong?: boolean }) {
  return (
    <div className="receipt-separator my-1 overflow-hidden whitespace-nowrap leading-none text-black">
      {strong ? "================================" : "--------------------------------"}
    </div>
  );
}

export default function ReceiptPreview({
  order,
  settings,
  autoPrint = false,
  screenHidden = false,
  onAfterPrint,
  onClose,
}: {
  order: CheckoutOrderRecord;
  settings: SettingsRecord | null;
  autoPrint?: boolean;
  screenHidden?: boolean;
  onAfterPrint?: () => void;
  onClose?: () => void;
}) {
  const paidAt = order.paidAt ? new Date(order.paidAt) : null;
  const printTime = new Date();
  const paymentMethod = order.payment?.method === "qris" ? "QRIS" : "TUNAI";
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    if (!autoPrint || hasPrintedRef.current) {
      return;
    }

    hasPrintedRef.current = true;
    const handleAfterPrint = () => {
      onAfterPrint?.();
    };
    const printTimer = window.setTimeout(() => {
      window.print();
    }, 300);

    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.clearTimeout(printTimer);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [autoPrint, onAfterPrint]);

  return (
    <div
      className={`receipt-preview rounded-md border border-[var(--border)] bg-[var(--card)] p-4 ${
        screenHidden ? "fixed left-[-9999px] top-0 opacity-0 print:opacity-100" : ""
      }`}
    >
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

      <div className="receipt-print-paper mx-auto mt-4 max-w-[58mm] rounded-sm border border-dashed border-[var(--border)] bg-white px-2 py-4 font-mono text-[12px] uppercase leading-tight tracking-normal text-black print:mt-0 print:border-0">
        <div className="text-center">
          <h3 className="text-[16px] font-semibold leading-none">
            {(settings?.storeName ?? "Maza Cafe").toUpperCase()}
          </h3>
          {settings?.storeAddress ? (
            <p className="mt-1 text-[13px] font-semibold leading-none">
              {settings.storeAddress.toUpperCase()}
            </p>
          ) : null}
          {settings?.storePhone ? (
            <p className="text-[12px] leading-none">{settings.storePhone}</p>
          ) : null}
        </div>

        <Separator strong />

        <div className="text-center text-[12px] leading-tight">
          <p>BILL:{order.orderNumber}</p>
          <p>POS:1|CSH:{(order.cashierName ?? "-").toUpperCase()}</p>
          <p>PAID: {paidAt ? formatReceiptDate(paidAt) : "-"}</p>
          <p>PRINT TIME: {formatReceiptDate(printTime)}</p>
        </div>

        <Separator strong />

        <div className="grid gap-1">
          {order.items.map((item) => (
            <div key={item.id}>
              <div className="grid grid-cols-[1fr_28px_58px_58px] gap-1">
                <span className="min-w-0 truncate">
                  {item.productNameSnapshot}
                  {item.variantNameSnapshot ? ` / ${item.variantNameSnapshot}` : ""}
                </span>
                <span className="text-right">{item.quantity}x</span>
                <span className="text-right">
                  {formatReceiptAmount(item.unitPrice)}
                </span>
                <span className="text-right">
                  {formatReceiptAmount(item.lineTotal)}
                </span>
              </div>
              {item.discountAmount > 0 ? (
                <div className="grid grid-cols-[1fr_58px] gap-1 pl-2">
                  <span>* DISCOUNT</span>
                  <span className="text-right">
                    -{formatReceiptAmount(item.discountAmount)}
                  </span>
                </div>
              ) : null}
              {item.notes ? (
                <div className="pl-2">* {item.notes}</div>
              ) : null}
            </div>
          ))}
        </div>

        <Separator strong />

        <div className="grid gap-1">
          <div className="grid grid-cols-[1fr_72px]">
            <span>SUB TOTAL</span>
            <span className="text-right">
              {formatReceiptAmount(order.subtotalAmount)}
            </span>
          </div>
          {order.discountAmount > 0 ? (
            <div className="grid grid-cols-[1fr_72px]">
              <span>DISCOUNT</span>
              <span className="text-right">
                -{formatReceiptAmount(order.discountAmount)}
              </span>
            </div>
          ) : null}
          {order.serviceChargeAmount > 0 ? (
            <div className="grid grid-cols-[1fr_72px]">
              <span>SERVICE</span>
              <span className="text-right">
                {formatReceiptAmount(order.serviceChargeAmount)}
              </span>
            </div>
          ) : null}
          <Separator />
          <div className="grid grid-cols-[1fr_72px] font-semibold">
            <span>TOTAL</span>
            <span className="text-right">
              {formatReceiptAmount(order.totalAmount)}
            </span>
          </div>
          {order.taxAmount > 0 ? (
            <>
              <Separator />
              <div>HARGA SUDAH TERMASUK PAJAK</div>
              <div className="grid grid-cols-[1fr_72px]">
                <span>PB1</span>
                <span className="text-right">
                  {formatReceiptAmount(order.taxAmount)}
                </span>
              </div>
            </>
          ) : null}
        </div>

        <Separator />

        <div className="grid gap-1">
          <p>Pembayaran</p>
          <div className="grid grid-cols-[1fr_72px] pl-4">
            <span>- {paymentMethod}</span>
            <span className="text-right">
              {formatReceiptAmount(order.payment?.amount ?? order.totalAmount)}
            </span>
          </div>
        </div>

        <Separator />

        <div className="grid gap-1">
          <div className="grid grid-cols-[1fr_72px]">
            <span>TUNAI</span>
            <span className="text-right">
              {formatReceiptAmount(
                order.payment?.cashReceivedAmount ?? order.payment?.amount ?? order.totalAmount,
              )}
            </span>
          </div>
          <div className="grid grid-cols-[1fr_72px]">
            <span>KEMBALIAN</span>
            <span className="text-right">
              {formatReceiptAmount(order.payment?.changeAmount ?? 0)}
            </span>
          </div>
        </div>

        <Separator strong />

        {order.queueNumber ? (
          <div className="my-4 text-center">
            <p className="text-[14px] leading-tight">NO PANGGIL:</p>
            <p className="text-[30px] font-semibold leading-none">
              {order.queueNumber}
            </p>
          </div>
        ) : null}

        {settings?.receiptFooter ? (
          <>
            <Separator strong />
            <p className="whitespace-pre-line text-center text-[12px] leading-tight">
              {settings.receiptFooter}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
