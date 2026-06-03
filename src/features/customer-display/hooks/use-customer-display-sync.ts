"use client";

import { useEffect, useRef } from "react";
import type { SettingsRecord } from "@/features/catalog/types";
import { calculateCartTotals } from "@/features/checkout/services/checkout-calculations";
import type { CartItem, CheckoutOrderRecord, OrderType } from "@/features/checkout/types";
import type {
  CustomerDisplayItemRecord,
  CustomerDisplayUpdateInput,
} from "../types";

function mapCartItems(items: CartItem[]): CustomerDisplayItemRecord[] {
  return items.map((item) => ({
    id: item.id,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discountAmount: item.discountAmount,
    lineTotal: item.unitPrice * item.quantity - item.discountAmount,
    selectedOptions: item.selectedOptions.map((option) => ({
      groupName: option.groupName,
      valueName: option.valueName,
      priceDelta: option.priceDelta,
    })),
  }));
}

function buildCheckoutSettings(settings: SettingsRecord | null) {
  return {
    taxEnabled: settings?.taxEnabled ?? false,
    taxRate: settings?.taxRate ?? 0,
    serviceChargeEnabled: settings?.serviceChargeEnabled ?? false,
    serviceChargeRate: settings?.serviceChargeRate ?? 0,
  };
}

async function syncCustomerDisplay(payload: CustomerDisplayUpdateInput) {
  await fetch("/api/customer-display", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function useCustomerDisplaySync({
  items,
  settings,
  orderType,
  isOnline,
}: {
  items: CartItem[];
  settings: SettingsRecord | null;
  orderType: OrderType | null;
  isOnline: boolean;
}) {
  const skipNextIdleSyncRef = useRef(false);

  useEffect(() => {
    if (!isOnline) return;

    const timeout = window.setTimeout(() => {
      const storeName = settings?.storeName ?? "Maza Cafe";
      const totals = calculateCartTotals(items, buildCheckoutSettings(settings));
      const mappedItems = mapCartItems(items);

      if (skipNextIdleSyncRef.current && items.length === 0) {
        skipNextIdleSyncRef.current = false;
        return;
      }

      const status = items.length > 0 ? "active" : "idle";

      void syncCustomerDisplay({
        status,
        storeName,
        orderType,
        items: mappedItems,
        totals,
        paidOrderNumber: null,
      });
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [isOnline, items, orderType, settings]);

  return {
    notifyPaid(order: CheckoutOrderRecord) {
      if (!isOnline) return;

      skipNextIdleSyncRef.current = true;
      const storeName = settings?.storeName ?? "Maza Cafe";

      void syncCustomerDisplay({
        status: "paid",
        storeName,
        orderType: order.orderType,
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.productNameSnapshot,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          lineTotal: item.lineTotal,
          selectedOptions: item.optionSelections.map((option) => ({
            groupName: option.groupNameSnapshot,
            valueName: option.valueNameSnapshot,
            priceDelta: option.priceDelta,
          })),
        })),
        totals: {
          subtotalAmount: order.subtotalAmount,
          discountAmount: order.discountAmount,
          serviceChargeAmount: order.serviceChargeAmount,
          taxAmount: order.taxAmount,
          totalAmount: order.totalAmount,
        },
        paidOrderNumber: order.orderNumber,
      });
    },
  };
}
