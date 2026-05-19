import { beforeEach, describe, expect, it } from "vitest";
import { useCartStore } from "./cart-store";
import type { ProductRecord } from "@/features/catalog/types";

const product: ProductRecord = {
  id: "product-1",
  categoryId: "category-1",
  categoryName: "Drinks",
  name: "Coffee",
  sku: "COF",
  description: null,
  imageUrl: null,
  price: 20_000,
  costPrice: null,
  trackStock: true,
  stockQuantity: 5,
  lowStockThreshold: 1,
  isAvailable: true,
  optionGroups: [
    {
      id: "group-temp",
      name: "Temperature",
      selectionType: "single",
      isRequired: true,
      sortOrder: 0,
      isActive: true,
      values: [
        {
          id: "value-iced",
          groupId: "group-temp",
          name: "Iced",
          priceDelta: 3_000,
          sortOrder: 0,
          isActive: true,
        },
      ],
    },
    {
      id: "group-topping",
      name: "Extra topping",
      selectionType: "multiple",
      isRequired: false,
      sortOrder: 1,
      isActive: true,
      values: [
        {
          id: "value-oat",
          groupId: "group-topping",
          name: "Oat milk",
          priceDelta: 5_000,
          sortOrder: 0,
          isActive: true,
        },
      ],
    },
  ],
};

describe("cart store", () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it("starts with an empty cart and adds base products", () => {
    useCartStore.getState().addItem({ product });

    expect(useCartStore.getState().items).toMatchObject([
      {
        id: "product-1:base",
        productId: "product-1",
        productName: "Coffee",
        unitPrice: 20_000,
        quantity: 1,
        trackStock: true,
        stockQuantity: 5,
      },
    ]);
  });

  it("increments quantity when the same product is added again", () => {
    useCartStore.getState().addItem({ product });
    useCartStore.getState().addItem({ product });

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it("keeps selected options as separate cart lines with adjusted pricing", () => {
    useCartStore.getState().addItem({
      product,
      selectedOptions: [product.optionGroups[0].values[0]],
    });
    useCartStore.getState().addItem({
      product,
      selectedOptions: [product.optionGroups[1].values[0]],
    });
    useCartStore.getState().addItem({
      product,
      selectedOptions: [product.optionGroups[0].values[0]],
    });

    expect(useCartStore.getState().items).toMatchObject([
      {
        id: "product-1:base:value-iced",
        unitPrice: 23_000,
        quantity: 2,
        selectedOptions: [
          {
            optionGroupId: "group-temp",
            optionValueId: "value-iced",
            groupName: "Temperature",
            valueName: "Iced",
            priceDelta: 3_000,
          },
        ],
      },
      {
        id: "product-1:base:value-oat",
        unitPrice: 25_000,
        quantity: 1,
      },
    ]);
  });

  it("removes an item when quantity is updated to zero", () => {
    useCartStore.getState().addItem({ product });
    useCartStore.getState().updateQuantity("product-1:base", 0);

    expect(useCartStore.getState().items).toEqual([]);
  });

  it("replaces the cart from a held order", () => {
    useCartStore.getState().replaceFromHeldOrder({
      id: "order-1",
      orderNumber: "ORD-1",
      cashierName: null,
      cashierEmail: null,
      status: "held",
      subtotalAmount: 20_000,
      discountAmount: 0,
      taxAmount: 0,
      serviceChargeAmount: 0,
      totalAmount: 20_000,
      heldAt: "2026-04-27T00:00:00.000Z",
      paidAt: null,
      createdAt: "2026-04-27T00:00:00.000Z",
      payment: null,
      items: [
        {
          id: "item-1",
          productId: "product-1",
          variantId: null,
          productNameSnapshot: "Coffee",
          variantNameSnapshot: null,
          quantity: 2,
          unitPrice: 20_000,
          discountAmount: 1_000,
          lineTotal: 39_000,
          notes: "less ice",
          optionSelections: [
            {
              id: "selection-1",
              optionGroupId: "group-temp",
              optionValueId: "value-iced",
              groupNameSnapshot: "Temperature",
              valueNameSnapshot: "Iced",
              priceDelta: 3_000,
            },
          ],
        },
      ],
    });

    expect(useCartStore.getState().items).toMatchObject([
      {
        id: "product-1:base:value-iced",
        productName: "Coffee",
        quantity: 2,
        discountAmount: 1_000,
        notes: "less ice",
        selectedOptions: [
          {
            optionGroupId: "group-temp",
            optionValueId: "value-iced",
            groupName: "Temperature",
            valueName: "Iced",
            priceDelta: 3_000,
          },
        ],
      },
    ]);
  });
});
