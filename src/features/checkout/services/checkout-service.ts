import { Prisma } from "@prisma/client";
import { NotFoundError, ValidationError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import type { User } from "@/features/auth/types";
import { getSettings } from "@/features/catalog/repositories/settings-repository";
import { calculateCartTotals } from "./checkout-calculations";
import { mapCheckoutOrder } from "./checkout-mappers";
import { createOrderNumber } from "./order-number";
import {
  checkoutOrderInclude,
  findOrderByIdForUser,
  findHeldOrderById,
  findProductsForCheckout,
  listOrdersForUser,
  listHeldOrdersForUser,
} from "../repositories/order-repository";
import type { CashCheckoutInput, CheckoutLineInput } from "../types";

function parseCheckoutItems(payload: Record<string, unknown>): CheckoutLineInput[] {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new ValidationError("Checkout requires at least one item.", {
      items: "Add at least one product to the cart.",
    });
  }

  return payload.items.map((rawItem, index) => {
    const item =
      rawItem && typeof rawItem === "object"
        ? (rawItem as Record<string, unknown>)
        : {};
    const productId = typeof item.productId === "string" ? item.productId : "";
    const variantId =
      typeof item.variantId === "string" && item.variantId ? item.variantId : null;
    const quantity = Number(item.quantity);
    const discountAmount = Number(item.discountAmount ?? 0);
    const notes = typeof item.notes === "string" ? item.notes.trim() : "";
    const fieldErrors: Record<string, string> = {};

    if (!productId) fieldErrors[`items.${index}.productId`] = "Product is required.";
    if (!Number.isFinite(quantity) || quantity <= 0) {
      fieldErrors[`items.${index}.quantity`] = "Quantity must be greater than 0.";
    }
    if (!Number.isFinite(discountAmount) || discountAmount < 0) {
      fieldErrors[`items.${index}.discountAmount`] =
        "Discount must be greater than or equal to 0.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidationError("Checkout item validation failed.", fieldErrors);
    }

    return {
      productId,
      variantId,
      quantity,
      discountAmount,
      notes,
    };
  });
}

export function parseCashCheckoutPayload(
  payload: Record<string, unknown>,
): CashCheckoutInput {
  const items = parseCheckoutItems(payload);
  const cashReceivedAmount = Number(payload.cashReceivedAmount);

  if (!Number.isFinite(cashReceivedAmount) || cashReceivedAmount < 0) {
    throw new ValidationError("Cash payment validation failed.", {
      cashReceivedAmount: "Cash received must be greater than or equal to 0.",
    });
  }

  return {
    items,
    cashReceivedAmount,
    notes: typeof payload.notes === "string" ? payload.notes.trim() : null,
  };
}

export function parseHoldOrderPayload(payload: Record<string, unknown>) {
  return {
    items: parseCheckoutItems(payload),
    notes: typeof payload.notes === "string" ? payload.notes.trim() : null,
  };
}

async function prepareCheckoutItems(
  items: CheckoutLineInput[],
  options: { validateStock: boolean } = { validateStock: true },
) {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await findProductsForCheckout(productIds);
  const productById = new Map(products.map((product) => [product.id, product]));

  const preparedItems = items.map((item, index) => {
    const product = productById.get(item.productId);

    if (!product || !product.category.isActive || !product.isAvailable) {
      throw new ValidationError("Product is not available for checkout.", {
        [`items.${index}.productId`]: "Product is unavailable.",
      });
    }

    const variant = item.variantId
      ? product.variants.find((candidate) => candidate.id === item.variantId)
      : null;

    if (item.variantId && (!variant || !variant.isActive)) {
      throw new ValidationError("Variant is not available for checkout.", {
        [`items.${index}.variantId`]: "Variant is unavailable.",
      });
    }

    if (
      options.validateStock &&
      product.trackStock &&
      product.stockQuantity !== null &&
      Number(product.stockQuantity) < item.quantity
    ) {
      throw new ValidationError("Insufficient stock for checkout.", {
        [`items.${index}.quantity`]: `${product.name} only has ${product.stockQuantity} left.`,
      });
    }

    const unitPrice = Number(product.price) + (variant ? Number(variant.priceDelta) : 0);
    const lineTotal = Math.max(unitPrice * item.quantity - item.discountAmount, 0);

    return {
      ...item,
      product,
      variant,
      unitPrice,
      lineTotal,
    };
  });

  const settings = await getSettings();
  const totals = calculateCartTotals(
    preparedItems.map((item) => ({
      id: `${item.productId}:${item.variantId ?? "base"}`,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.product.name,
      variantName: item.variant?.name ?? null,
      categoryName: item.product.category.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      discountAmount: item.discountAmount,
      notes: item.notes,
      trackStock: item.product.trackStock,
      stockQuantity:
        item.product.stockQuantity === null ? null : Number(item.product.stockQuantity),
    })),
    {
      taxEnabled: settings.taxEnabled,
      taxRate: Number(settings.taxRate),
      serviceChargeEnabled: settings.serviceChargeEnabled,
      serviceChargeRate: Number(settings.serviceChargeRate),
    },
  );

  return { preparedItems, totals };
}

export async function finalizeCashCheckout(input: CashCheckoutInput, actor: User) {
  const { preparedItems, totals } = await prepareCheckoutItems(input.items);

  if (input.cashReceivedAmount < totals.totalAmount) {
    throw new ValidationError("Cash received is less than the order total.", {
      cashReceivedAmount: "Cash received must cover the total.",
    });
  }

  const paidAt = new Date();
  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        orderNumber: createOrderNumber(paidAt),
        cashierId: actor.id,
        status: "paid",
        subtotalAmount: new Prisma.Decimal(totals.subtotalAmount),
        discountAmount: new Prisma.Decimal(totals.discountAmount),
        taxAmount: new Prisma.Decimal(totals.taxAmount),
        serviceChargeAmount: new Prisma.Decimal(totals.serviceChargeAmount),
        totalAmount: new Prisma.Decimal(totals.totalAmount),
        notes: input.notes,
        paidAt,
        items: {
          create: preparedItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productNameSnapshot: item.product.name,
            variantNameSnapshot: item.variant?.name ?? null,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            discountAmount: new Prisma.Decimal(item.discountAmount),
            lineTotal: new Prisma.Decimal(item.lineTotal),
            notes: item.notes || null,
          })),
        },
        payments: {
          create: {
            method: "cash",
            status: "paid",
            amount: new Prisma.Decimal(totals.totalAmount),
            cashReceivedAmount: new Prisma.Decimal(input.cashReceivedAmount),
            changeAmount: new Prisma.Decimal(
              input.cashReceivedAmount - totals.totalAmount,
            ),
            paidAt,
          },
        },
      },
      include: checkoutOrderInclude,
    });

    for (const item of preparedItems) {
      if (!item.product.trackStock) continue;

      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            decrement: new Prisma.Decimal(item.quantity),
          },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          orderId: createdOrder.id,
          type: "sale_deduction",
          quantityChange: new Prisma.Decimal(-item.quantity),
          reason: "Cash order payment confirmed",
          createdByUserId: actor.id,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        action: "order.paid",
        entityType: "order",
        entityId: createdOrder.id,
        metadata: {
          orderNumber: createdOrder.orderNumber,
          method: "cash",
          totalAmount: totals.totalAmount,
        },
      },
    });

    return createdOrder;
  });

  return mapCheckoutOrder(order);
}

export async function holdOrder(
  input: { items: CheckoutLineInput[]; notes?: string | null },
  actor: User,
) {
  const { preparedItems, totals } = await prepareCheckoutItems(input.items, {
    validateStock: false,
  });
  const heldAt = new Date();

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        orderNumber: createOrderNumber(heldAt),
        cashierId: actor.id,
        status: "held",
        subtotalAmount: new Prisma.Decimal(totals.subtotalAmount),
        discountAmount: new Prisma.Decimal(totals.discountAmount),
        taxAmount: new Prisma.Decimal(totals.taxAmount),
        serviceChargeAmount: new Prisma.Decimal(totals.serviceChargeAmount),
        totalAmount: new Prisma.Decimal(totals.totalAmount),
        notes: input.notes,
        heldAt,
        items: {
          create: preparedItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productNameSnapshot: item.product.name,
            variantNameSnapshot: item.variant?.name ?? null,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            discountAmount: new Prisma.Decimal(item.discountAmount),
            lineTotal: new Prisma.Decimal(item.lineTotal),
            notes: item.notes || null,
          })),
        },
      },
      include: checkoutOrderInclude,
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        action: "order.held",
        entityType: "order",
        entityId: createdOrder.id,
        metadata: {
          orderNumber: createdOrder.orderNumber,
          totalAmount: totals.totalAmount,
        },
      },
    });

    return createdOrder;
  });

  return mapCheckoutOrder(order);
}

export async function getHeldOrders(actor: User) {
  const orders = await listHeldOrdersForUser(actor);
  return orders.map(mapCheckoutOrder);
}

export async function getHeldOrder(id: string, actor: User) {
  const order = await findHeldOrderById(id, actor);
  if (!order) {
    throw new NotFoundError("Held order was not found.");
  }

  return mapCheckoutOrder(order);
}

export function parseOrderStatusFilter(status: string | null) {
  if (!status) return undefined;

  const allowedStatuses = [
    "draft",
    "held",
    "pending_payment",
    "paid",
    "cancelled",
    "refunded",
  ] as const;

  if (!allowedStatuses.includes(status as (typeof allowedStatuses)[number])) {
    throw new ValidationError("Order status filter is invalid.", {
      status: "Use a valid order status.",
    });
  }

  return status as (typeof allowedStatuses)[number];
}

export async function getOrders(
  actor: User,
  filters: { status?: ReturnType<typeof parseOrderStatusFilter> } = {},
) {
  const orders = await listOrdersForUser(actor, filters);
  return orders.map(mapCheckoutOrder);
}

export async function getOrder(id: string, actor: User) {
  const order = await findOrderByIdForUser(id, actor);
  if (!order) {
    throw new NotFoundError("Order was not found.");
  }

  return mapCheckoutOrder(order);
}

export async function cancelOrder(id: string, actor: User) {
  const existing = await findOrderByIdForUser(id, actor);
  if (!existing) {
    throw new NotFoundError("Order was not found.");
  }

  if (!["draft", "held", "pending_payment"].includes(existing.status)) {
    throw new ValidationError("Only unpaid orders can be cancelled.", {
      status: "Paid, refunded, and already cancelled orders cannot be cancelled.",
    });
  }

  const cancelledAt = new Date();
  const order = await prisma.$transaction(async (tx) => {
    const cancelledOrder = await tx.order.update({
      where: { id },
      data: {
        status: "cancelled",
        cancelledAt,
      },
      include: checkoutOrderInclude,
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        action: "order.cancelled",
        entityType: "order",
        entityId: id,
        metadata: {
          orderNumber: existing.orderNumber,
          previousStatus: existing.status,
        },
      },
    });

    return cancelledOrder;
  });

  return mapCheckoutOrder(order);
}
