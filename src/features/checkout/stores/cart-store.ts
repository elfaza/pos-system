"use client";

import { create } from "zustand";
import type {
  AddCartItemInput,
  CartItem,
  CheckoutOrderRecord,
  SelectedOptionRecord,
} from "../types";

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
  const selectedOptionIds = (input.selectedOptions ?? [])
    .map((option) => option.id)
    .sort()
    .join(":");

  return [
    input.product.id,
    "base",
    selectedOptionIds,
  ]
    .filter(Boolean)
    .join(":");
}

function mapSelectedOptions(input: AddCartItemInput): SelectedOptionRecord[] {
  return (input.selectedOptions ?? []).map((option) => {
    const group = input.product.optionGroups.find(
      (candidate) => candidate.id === option.groupId,
    );

    return {
      optionGroupId: option.groupId,
      optionValueId: option.id,
      groupName: group?.name ?? "Option",
      valueName: option.name,
      priceDelta: option.priceDelta,
    };
  });
}

function buildCartItem(input: AddCartItemInput): CartItem {
  const selectedOptions = mapSelectedOptions(input);
  const optionPriceDelta = selectedOptions.reduce(
    (total, option) => total + option.priceDelta,
    0,
  );

  return {
    id: buildCartItemId(input),
    productId: input.product.id,
    variantId: null,
    productName: input.product.name,
    variantName: null,
    selectedOptions,
    categoryName: input.product.categoryName,
    unitPrice: input.product.price + optionPriceDelta,
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
        id: [
          item.productId,
          "base",
          item.optionSelections
            .map((selection) => selection.optionValueId)
            .filter(Boolean)
            .sort()
            .join(":"),
        ]
          .filter(Boolean)
          .join(":"),
        productId: item.productId,
        variantId: null,
        productName: item.productNameSnapshot,
        variantName: null,
        selectedOptions: item.optionSelections.map((selection) => ({
          optionGroupId: selection.optionGroupId,
          optionValueId: selection.optionValueId,
          groupName: selection.groupNameSnapshot,
          valueName: selection.valueNameSnapshot,
          priceDelta: selection.priceDelta,
        })),
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
