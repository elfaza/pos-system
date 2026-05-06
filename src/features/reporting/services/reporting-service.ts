import { PaymentMethod, Prisma } from "@prisma/client";
import { ValidationError } from "@/lib/api-response";
import { requireModuleEnabled } from "@/features/catalog/services/module-config";
import {
  listReportIngredients,
  listReportOrders,
  listReportProducts,
  listReportStockMovements,
  type ReportIngredientRow,
  type ReportOrderRow,
  type ReportProductRow,
} from "../repositories/reporting-repository";
import type {
  CashierReportItem,
  DashboardReport,
  PaymentSummaryItem,
  StockReportItem,
  StockReportSummary,
  TopProductReportItem,
} from "../types";

const maxReportDays = 31;
const defaultTopProductLimit = 10;
const defaultTimeZone = "Asia/Jakarta";
const defaultBusinessDayStartTime = "00:00";

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return Number(value);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatDateInput(date: Date, timeZone = defaultTimeZone): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseDateInput(value: string | null, field: "dateFrom" | "dateTo") {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError("Report date range is invalid.", {
      [field]: "Use YYYY-MM-DD format.",
    });
  }

  const [year, month, day] = value.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  const isRealCalendarDate =
    calendarDate.getUTCFullYear() === year &&
    calendarDate.getUTCMonth() === month - 1 &&
    calendarDate.getUTCDate() === day;

  if (!isRealCalendarDate) {
    throw new ValidationError("Report date range is invalid.", {
      [field]: "Use a valid calendar date.",
    });
  }

  return value;
}

function parseBusinessTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return {
    hour: Number.isInteger(hour) ? hour : 0,
    minute: Number.isInteger(minute) ? minute : 0,
  };
}

function zonedLocalTimeToUtc(
  value: string,
  timeZone = defaultTimeZone,
  businessDayStartTime = defaultBusinessDayStartTime,
) {
  const [year, month, day] = value.split("-").map(Number);
  const { hour, minute } = parseBusinessTime(businessDayStartTime);
  const desiredLocalAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const estimatedUtc = new Date(desiredLocalAsUtc);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(estimatedUtc);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  const actualLocalAsUtc = Date.UTC(
    Number(byType.get("year")),
    Number(byType.get("month")) - 1,
    Number(byType.get("day")),
    Number(byType.get("hour")),
    Number(byType.get("minute")),
    Number(byType.get("second")),
  );

  return new Date(desiredLocalAsUtc + (desiredLocalAsUtc - actualLocalAsUtc));
}

function addBusinessDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateInput(date, "UTC");
}

function startOfBusinessDate(
  value: string,
  timeZone = defaultTimeZone,
  businessDayStartTime = defaultBusinessDayStartTime,
): Date {
  return zonedLocalTimeToUtc(value, timeZone, businessDayStartTime);
}

function exclusiveEndOfBusinessDate(
  value: string,
  timeZone = defaultTimeZone,
  businessDayStartTime = defaultBusinessDayStartTime,
): Date {
  return zonedLocalTimeToUtc(
    addBusinessDays(value, 1),
    timeZone,
    businessDayStartTime,
  );
}

export function parseReportDateRange(
  url: URL,
  config: {
    timeZone?: string;
    businessDayStartTime?: string;
  } = {},
) {
  const timeZone = config.timeZone ?? defaultTimeZone;
  const businessDayStartTime =
    config.businessDayStartTime ?? defaultBusinessDayStartTime;
  const today = formatDateInput(new Date(), timeZone);
  const dateFrom = parseDateInput(url.searchParams.get("dateFrom"), "dateFrom") ?? today;
  const dateTo = parseDateInput(url.searchParams.get("dateTo"), "dateTo") ?? dateFrom;
  const from = startOfBusinessDate(dateFrom, timeZone, businessDayStartTime);
  const to = exclusiveEndOfBusinessDate(dateTo, timeZone, businessDayStartTime);

  if (from.getTime() >= to.getTime()) {
    throw new ValidationError("Report date range is invalid.", {
      dateTo: "End date must be on or after start date.",
    });
  }

  const dayCount = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  if (dayCount > maxReportDays) {
    throw new ValidationError("Report date range is too large.", {
      dateTo: `Choose a range of ${maxReportDays} days or less.`,
    });
  }

  return {
    dateFrom,
    dateTo,
    from,
    to,
  };
}

function getOrderRefundAmount(order: ReportOrderRow) {
  return roundMoney(order.refunds.reduce((sum, refund) => sum + toNumber(refund.amount), 0));
}

function getOrderPayment(order: ReportOrderRow) {
  return order.payments[0] ?? null;
}

function buildPaymentSummary(orders: ReportOrderRow[]): PaymentSummaryItem[] {
  const byMethod = new Map<PaymentMethod, PaymentSummaryItem>();

  for (const method of Object.values(PaymentMethod)) {
    byMethod.set(method, {
      method,
      salesAmount: 0,
      refundAmount: 0,
      netAmount: 0,
      paymentCount: 0,
    });
  }

  for (const order of orders) {
    const payment = getOrderPayment(order);
    if (!payment) continue;

    const item = byMethod.get(payment.method);
    if (!item) continue;

    const salesAmount = toNumber(payment.amount);
    const refundAmount = getOrderRefundAmount(order);
    item.salesAmount = roundMoney(item.salesAmount + salesAmount);
    item.refundAmount = roundMoney(item.refundAmount + refundAmount);
    item.netAmount = roundMoney(item.netAmount + salesAmount - refundAmount);
    item.paymentCount += 1;
  }

  return [...byMethod.values()].filter(
    (item) => item.paymentCount > 0 || item.method === "cash",
  );
}

function buildTopProducts(orders: ReportOrderRow[]): TopProductReportItem[] {
  const byProduct = new Map<string, TopProductReportItem>();

  for (const order of orders) {
    const orderRefundAmount = getOrderRefundAmount(order);
    const orderTotal = toNumber(order.totalAmount);
    const isRefunded = order.status === "refunded" || orderRefundAmount >= orderTotal;

    for (const item of order.items) {
      const productKey = `${item.productId}:${item.variantId ?? "base"}`;
      const current = byProduct.get(productKey) ?? {
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productNameSnapshot,
        variantName: item.variantNameSnapshot,
        quantitySold: 0,
        refundedQuantity: 0,
        grossRevenue: 0,
        discountAmount: 0,
        refundAmount: 0,
        netRevenue: 0,
      };
      const quantity = toNumber(item.quantity);
      const lineTotal = toNumber(item.lineTotal);
      const lineRefundAmount =
        orderTotal > 0 ? roundMoney((lineTotal / orderTotal) * orderRefundAmount) : 0;

      current.quantitySold = roundMoney(current.quantitySold + quantity);
      current.refundedQuantity = roundMoney(
        current.refundedQuantity + (isRefunded ? quantity : 0),
      );
      current.grossRevenue = roundMoney(current.grossRevenue + lineTotal);
      current.discountAmount = roundMoney(
        current.discountAmount + toNumber(item.discountAmount),
      );
      current.refundAmount = roundMoney(current.refundAmount + lineRefundAmount);
      current.netRevenue = roundMoney(
        current.netRevenue + Math.max(lineTotal - lineRefundAmount, 0),
      );
      byProduct.set(productKey, current);
    }
  }

  return [...byProduct.values()]
    .sort((first, second) => {
      const quantityDifference = second.quantitySold - first.quantitySold;
      if (quantityDifference !== 0) return quantityDifference;
      const revenueDifference = second.netRevenue - first.netRevenue;
      if (revenueDifference !== 0) return revenueDifference;
      return first.productName.localeCompare(second.productName);
    })
    .slice(0, defaultTopProductLimit);
}

function getStockStatus(row: {
  isActive: boolean;
  currentStock: Prisma.Decimal | number | string | null;
  lowStockThreshold: Prisma.Decimal | number | string | null;
}): StockReportItem["status"] {
  if (!row.isActive) return "inactive";
  const currentStock = toNumber(row.currentStock);
  if (currentStock <= 0) return "out";
  if (row.lowStockThreshold !== null && currentStock <= toNumber(row.lowStockThreshold)) {
    return "low";
  }
  return "ok";
}

function mapIngredientStockItem(ingredient: ReportIngredientRow): StockReportItem {
  return {
    id: ingredient.id,
    kind: "ingredient",
    name: ingredient.name,
    unit: ingredient.unit,
    currentStock: toNumber(ingredient.currentStock),
    lowStockThreshold:
      ingredient.lowStockThreshold === null ? null : toNumber(ingredient.lowStockThreshold),
    status: getStockStatus(ingredient),
    isActive: ingredient.isActive,
    lastMovementAt: ingredient.stockMovements[0]?.createdAt.toISOString() ?? null,
  };
}

function mapProductStockItem(product: ReportProductRow): StockReportItem {
  return {
    id: product.id,
    kind: "product",
    name: product.name,
    unit: "pcs",
    currentStock: toNumber(product.stockQuantity),
    lowStockThreshold:
      product.lowStockThreshold === null ? null : toNumber(product.lowStockThreshold),
    status: getStockStatus({
      isActive: product.isAvailable,
      currentStock: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
    }),
    isActive: product.isAvailable,
    lastMovementAt: product.stockMovements[0]?.createdAt.toISOString() ?? null,
  };
}

function buildStockReport(
  ingredients: ReportIngredientRow[],
  products: ReportProductRow[],
  movements: Awaited<ReturnType<typeof listReportStockMovements>>,
) {
  const items = [
    ...ingredients.map(mapIngredientStockItem),
    ...products.map(mapProductStockItem),
  ].sort((first, second) => {
    const statusOrder = { out: 0, low: 1, ok: 2, inactive: 3 };
    const statusDifference = statusOrder[first.status] - statusOrder[second.status];
    if (statusDifference !== 0) return statusDifference;
    return first.name.localeCompare(second.name);
  });

  const summary: StockReportSummary = {
    activeStockItems: items.filter((item) => item.isActive).length,
    lowStockCount: items.filter((item) => item.status === "low").length,
    outOfStockCount: items.filter((item) => item.status === "out").length,
    movementCount: movements.reduce((sum, movement) => sum + movement._count._all, 0),
    saleDeductionCount:
      movements.find((movement) => movement.type === "sale_deduction")?._count._all ?? 0,
    adjustmentCount:
      movements.find((movement) => movement.type === "adjustment")?._count._all ?? 0,
    wasteCount: movements.find((movement) => movement.type === "waste")?._count._all ?? 0,
    refundRestoreCount:
      movements.find((movement) => movement.type === "refund_restore")?._count._all ?? 0,
  };

  return {
    summary,
    movementSummary: movements
      .map((movement) => ({
        type: movement.type,
        movementCount: movement._count._all,
        totalQuantityChange: toNumber(movement._sum.quantityChange),
      }))
      .sort((first, second) => first.type.localeCompare(second.type)),
    items,
  };
}

function buildCashierReport(orders: ReportOrderRow[]): CashierReportItem[] {
  const byCashier = new Map<string, CashierReportItem>();

  for (const order of orders) {
    const refundAmount = getOrderRefundAmount(order);
    const grossSales = toNumber(order.totalAmount);
    const current = byCashier.get(order.cashierId) ?? {
      cashierId: order.cashierId,
      cashierName: order.cashier.name,
      orderCount: 0,
      grossSales: 0,
      refundAmount: 0,
      netSales: 0,
      averageOrderValue: 0,
      refundCount: 0,
    };

    current.orderCount += 1;
    current.grossSales = roundMoney(current.grossSales + grossSales);
    current.refundAmount = roundMoney(current.refundAmount + refundAmount);
    current.netSales = roundMoney(current.netSales + grossSales - refundAmount);
    current.averageOrderValue = roundMoney(current.netSales / current.orderCount);
    current.refundCount += order.refunds.length;
    byCashier.set(order.cashierId, current);
  }

  return [...byCashier.values()].sort((first, second) => {
    const salesDifference = second.netSales - first.netSales;
    if (salesDifference !== 0) return salesDifference;
    return first.cashierName.localeCompare(second.cashierName);
  });
}

export async function getDashboardReport(url: URL): Promise<DashboardReport> {
  const settings = await requireModuleEnabled("reportingEnabled");
  const dateRange = parseReportDateRange(url, {
    timeZone: settings.timeZone,
    businessDayStartTime: settings.businessDayStartTime,
  });
  const [orders, ingredients, products, movements] = await Promise.all([
    listReportOrders({ paidFrom: dateRange.from, paidTo: dateRange.to }),
    listReportIngredients(),
    listReportProducts(),
    listReportStockMovements({ dateFrom: dateRange.from, dateTo: dateRange.to }),
  ]);

  const refundAmount = roundMoney(
    orders.reduce((sum, order) => sum + getOrderRefundAmount(order), 0),
  );
  const grossSales = roundMoney(
    orders.reduce((sum, order) => sum + toNumber(order.totalAmount), 0),
  );
  const netSales = roundMoney(grossSales - refundAmount);
  const orderCount = orders.length;

  return {
    dateRange: {
      dateFrom: dateRange.dateFrom,
      dateTo: dateRange.dateTo,
    },
    dailySales: {
      grossSales,
      discountAmount: roundMoney(
        orders.reduce((sum, order) => sum + toNumber(order.discountAmount), 0),
      ),
      taxAmount: roundMoney(
        orders.reduce((sum, order) => sum + toNumber(order.taxAmount), 0),
      ),
      serviceChargeAmount: roundMoney(
        orders.reduce((sum, order) => sum + toNumber(order.serviceChargeAmount), 0),
      ),
      refundAmount,
      netSales,
      orderCount,
      averageOrderValue: orderCount > 0 ? roundMoney(netSales / orderCount) : 0,
    },
    paymentSummary: buildPaymentSummary(orders),
    topProducts: buildTopProducts(orders),
    stockReport: buildStockReport(ingredients, products, movements),
    cashierReport: buildCashierReport(orders),
    orderDetails: orders.map((order) => {
      const payment = getOrderPayment(order);
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        paidAt: order.paidAt?.toISOString() ?? null,
        cashierName: order.cashier.name,
        paymentMethod: payment?.method ?? null,
        paymentStatus: payment?.status ?? null,
        totalAmount: toNumber(order.totalAmount),
        refundAmount: getOrderRefundAmount(order),
        status: order.status,
        queueNumber: order.queueNumber,
        kitchenStatus: order.kitchenStatus,
      };
    }),
  };
}
