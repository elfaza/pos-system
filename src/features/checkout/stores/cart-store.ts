"use client";

import { create } from "zustand";
import type { AddCartItemInput, CartItem, CheckoutOrderRecord } from "../types";

interface CartState {
  items: CartItem[];
  addItem: (input: AddCartItemInput) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateNotes: (itemId: string, notes: string) => void;
  replaceFromHeldOrder: (order: CheckoutOrderRecord) => void;
  clearCart: () => void;
}

function buildCartItemId(input: AddCartItemInput): string {
  return `${input.product.id}:${input.variant?.id ?? "base"}`;
}

function buildCartItem(input: AddCartItemInput): CartItem {
  const variant = input.variant ?? null;

  return {
    id: buildCartItemId(input),
    productId: input.product.id,
    variantId: variant?.id ?? null,
    productName: input.product.name,
    variantName: variant?.name ?? null,
    categoryName: input.product.categoryName,
    unitPrice: input.product.price + (variant?.priceDelta ?? 0),
    quantity: 1,
    discountAmount: 0,
    notes: "",
    trackStock: input.product.trackStock,
    stockQuantity: input.product.stockQuantity,
  };
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (input) =>
    set((state) => {
      const itemId = buildCartItemId(input);
      const existing = state.items.find((item) => item.id === itemId);

      if (existing) {
        return {
          items: state.items.map((item) =>
            item.id === itemId
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        };
      }

      return { items: [...state.items, buildCartItem(input)] };
    }),
  removeItem: (itemId) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== itemId),
    })),
  updateQuantity: (itemId, quantity) =>
    set((state) => ({
      items: state.items
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: Math.max(quantity, 0) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    })),
  updateNotes: (itemId, notes) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, notes } : item,
      ),
    })),
  replaceFromHeldOrder: (order) =>
    set({
      items: order.items.map((item) => ({
        id: `${item.productId}:${item.variantId ?? "base"}`,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productNameSnapshot,
        variantName: item.variantNameSnapshot,
        categoryName: "",
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discountAmount: item.discountAmount,
        notes: item.notes ?? "",
        trackStock: false,
        stockQuantity: null,
      })),
    }),
  clearCart: () => set({ items: [] }),
}));
