import type { Prisma } from "@prisma/client";
import { ValidationError } from "@/lib/api-response";
import { getSettings } from "@/features/catalog/repositories/settings-repository";
import { getCategoryList } from "@/features/catalog/services/category-service";
import { getAvailableProductList } from "@/features/catalog/services/product-service";
import type { TenantContext } from "@/features/auth/types";
import type {
  CustomerDisplayMenuRecord,
  CustomerDisplayRecord,
  CustomerDisplayUpdateInput,
} from "../types";
import {
  findCustomerDisplayState,
  upsertCustomerDisplayState,
} from "../repositories/customer-display-repository";

const PAID_DISPLAY_MS = 10_000;

const emptyTotals = {
  subtotalAmount: 0,
  discountAmount: 0,
  serviceChargeAmount: 0,
  taxAmount: 0,
  totalAmount: 0,
};

function defaultIdleRecord(storeName: string): CustomerDisplayRecord {
  return {
    status: "idle",
    storeName,
    orderType: null,
    items: [],
    totals: emptyTotals,
    paidOrderNumber: null,
    updatedAt: new Date().toISOString(),
  };
}

function parsePayload(value: unknown): Omit<
  CustomerDisplayRecord,
  "status" | "storeName" | "paidOrderNumber" | "updatedAt"
> {
  if (!value || typeof value !== "object") {
    return {
      orderType: null,
      items: [],
      totals: emptyTotals,
    };
  }

  const payload = value as Record<string, unknown>;
  const totals = payload.totals;
  const items = Array.isArray(payload.items) ? payload.items : [];

  return {
    orderType:
      payload.orderType === "dine_in" ||
      payload.orderType === "takeaway" ||
      payload.orderType === "delivery"
        ? payload.orderType
        : null,
    items: items
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : "",
        productName: typeof item.productName === "string" ? item.productName : "Item",
        quantity: typeof item.quantity === "number" ? item.quantity : 0,
        unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : 0,
        discountAmount: typeof item.discountAmount === "number" ? item.discountAmount : 0,
        lineTotal: typeof item.lineTotal === "number" ? item.lineTotal : 0,
        selectedOptions: Array.isArray(item.selectedOptions)
          ? item.selectedOptions
              .filter((option): option is Record<string, unknown> => !!option && typeof option === "object")
              .map((option) => ({
                groupName: typeof option.groupName === "string" ? option.groupName : "Option",
                valueName: typeof option.valueName === "string" ? option.valueName : "",
                priceDelta: typeof option.priceDelta === "number" ? option.priceDelta : 0,
              }))
          : [],
      })),
    totals:
      totals && typeof totals === "object"
        ? {
            subtotalAmount:
              typeof (totals as Record<string, unknown>).subtotalAmount === "number"
                ? (totals as Record<string, number>).subtotalAmount
                : 0,
            discountAmount:
              typeof (totals as Record<string, unknown>).discountAmount === "number"
                ? (totals as Record<string, number>).discountAmount
                : 0,
            serviceChargeAmount:
              typeof (totals as Record<string, unknown>).serviceChargeAmount === "number"
                ? (totals as Record<string, number>).serviceChargeAmount
                : 0,
            taxAmount:
              typeof (totals as Record<string, unknown>).taxAmount === "number"
                ? (totals as Record<string, number>).taxAmount
                : 0,
            totalAmount:
              typeof (totals as Record<string, unknown>).totalAmount === "number"
                ? (totals as Record<string, number>).totalAmount
                : 0,
          }
        : emptyTotals,
  };
}

function mapRecord(state: {
  status: CustomerDisplayRecord["status"];
  storeName: string;
  payload: unknown;
  paidOrderNumber: string | null;
  paidAt: Date | null;
  updatedAt: Date;
}): CustomerDisplayRecord {
  const parsed = parsePayload(state.payload);

  if (
    state.status === "paid" &&
    state.paidAt &&
    Date.now() - state.paidAt.getTime() > PAID_DISPLAY_MS
  ) {
    return defaultIdleRecord(state.storeName);
  }

  return {
    status: state.status,
    storeName: state.storeName,
    orderType: parsed.orderType,
    items: parsed.items,
    totals: parsed.totals,
    paidOrderNumber: state.paidOrderNumber,
    updatedAt: state.updatedAt.toISOString(),
  };
}

export async function getCustomerDisplay(context: TenantContext): Promise<CustomerDisplayRecord> {
  const settings = await getSettings(context);
  const state = await findCustomerDisplayState(context);

  if (!state) {
    return defaultIdleRecord(settings.storeName);
  }

  const record = mapRecord(state);
  if (record.status === "idle" && !record.storeName) {
    return { ...record, storeName: settings.storeName };
  }

  return record;
}

export async function getCustomerDisplayMenu(context: TenantContext): Promise<CustomerDisplayMenuRecord> {
  const [categories, products] = await Promise.all([
    getCategoryList(context, false),
    getAvailableProductList(context),
  ]);

  return {
    categories: categories.flatMap((category) => {
      const categoryProducts = products
        .filter((product) => product.categoryId === category.id && product.canSellOne)
        .map((product) => ({
          id: product.id,
          name: product.name,
          imageUrl: product.imageUrl,
          price: product.price,
        }));

      if (categoryProducts.length === 0) return [];

      return [{ id: category.id, name: category.name, products: categoryProducts }];
    }),
  };
}

function validateUpdateInput(payload: Record<string, unknown>): CustomerDisplayUpdateInput {
  const status = payload.status;
  const storeName = typeof payload.storeName === "string" ? payload.storeName.trim() : "";
  const orderType = payload.orderType;
  const paidOrderNumber =
    payload.paidOrderNumber === null || typeof payload.paidOrderNumber === "string"
      ? payload.paidOrderNumber
      : null;
  const fieldErrors: Record<string, string> = {};

  if (status !== "idle" && status !== "active" && status !== "paid") {
    fieldErrors.status = "Status must be idle, active, or paid.";
  }
  if (!storeName) {
    fieldErrors.storeName = "Store name is required.";
  }

  const parsed = parsePayload({
    orderType,
    items: payload.items,
    totals: payload.totals,
  });

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError("Customer display validation failed.", fieldErrors);
  }

  return {
    status: status as CustomerDisplayUpdateInput["status"],
    storeName,
    orderType: parsed.orderType,
    items: parsed.items,
    totals: parsed.totals,
    paidOrderNumber,
  };
}

export async function updateCustomerDisplayFromPayload(
  payload: Record<string, unknown>,
  context: TenantContext,
): Promise<CustomerDisplayRecord> {
  const input = validateUpdateInput(payload);
  const paidAt = input.status === "paid" ? new Date() : null;

  const state = await upsertCustomerDisplayState({
    context,
    status: input.status,
    storeName: input.storeName,
    payload: {
      orderType: input.orderType ?? null,
      items: input.items,
      totals: input.totals,
    } as unknown as Prisma.InputJsonValue,
    paidOrderNumber: input.status === "paid" ? input.paidOrderNumber ?? null : null,
    paidAt,
  });

  return mapRecord(state);
}
