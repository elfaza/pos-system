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
  variants: [
    {
      id: "variant-large",
      name: "Large",
      sku: null,
      priceDelta: 5_000,
      costDelta: null,
      isActive: true,
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

  it("increments quantity when the same product and variant are added again", () => {
    useCartStore.getState().addItem({ product });
    useCartStore.getState().addItem({ product });

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it("keeps variants as separate cart lines with adjusted pricing", () => {
    useCartStore.getState().addItem({ product });
    useCartStore.getState().addItem({ product, variant: product.variants[0] });

    expect(useCartStore.getState().items).toMatchObject([
      { id: "product-1:base", unitPrice: 20_000 },
      { id: "product-1:variant-large", variantName: "Large", unitPrice: 25_000 },
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
        },
      ],
    });

    expect(useCartStore.getState().items).toMatchObject([
      {
        id: "product-1:base",
        productName: "Coffee",
        quantity: 2,
        discountAmount: 1_000,
        notes: "less ice",
      },
    ]);
  });
});
