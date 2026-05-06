import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/lib/api-response";
import {
  getDashboardReport,
  parseReportDateRange,
} from "./reporting-service";

const mocks = vi.hoisted(() => ({
  listReportIngredients: vi.fn(),
  listReportOrders: vi.fn(),
  listReportProducts: vi.fn(),
  listReportStockMovements: vi.fn(),
  requireModuleEnabled: vi.fn(),
}));

vi.mock("@/features/catalog/services/module-config", () => ({
  requireModuleEnabled: mocks.requireModuleEnabled,
}));

vi.mock("../repositories/reporting-repository", () => ({
  listReportIngredients: mocks.listReportIngredients,
  listReportOrders: mocks.listReportOrders,
  listReportProducts: mocks.listReportProducts,
  listReportStockMovements: mocks.listReportStockMovements,
}));

const paidAt = new Date("2026-04-29T03:00:00.000Z");

function buildOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    orderNumber: "ORD-001",
    cashierId: "cashier-1",
    status: "paid",
    subtotalAmount: "100000",
    discountAmount: "10000",
    taxAmount: "9000",
    serviceChargeAmount: "1000",
    totalAmount: "100000",
    kitchenStatus: "received",
    queueNumber: 12,
    paidAt,
    cashier: {
      id: "cashier-1",
      name: "Dina",
      email: "dina@pos.local",
    },
    payments: [
      {
        id: "payment-1",
        method: "cash",
        status: "paid",
        amount: "100000",
        paidAt,
      },
    ],
    refunds: [],
    items: [
      {
        id: "item-1",
        productId: "product-1",
        variantId: null,
        productNameSnapshot: "Latte",
        variantNameSnapshot: null,
        quantity: "2",
        unitPrice: "50000",
        discountAmount: "10000",
        lineTotal: "90000",
        createdAt: paidAt,
      },
      {
        id: "item-2",
        productId: "product-2",
        variantId: "variant-1",
        productNameSnapshot: "Tea",
        variantNameSnapshot: "Large",
        quantity: "1",
        unitPrice: "10000",
        discountAmount: "0",
        lineTotal: "10000",
        createdAt: paidAt,
      },
    ],
    ...overrides,
  };
}

describe("reporting service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireModuleEnabled.mockResolvedValue({
      timeZone: "Asia/Jakarta",
      businessDayStartTime: "00:00",
    });
    mocks.listReportIngredients.mockResolvedValue([
      {
        id: "ingredient-1",
        name: "Milk",
        sku: "MILK",
        unit: "ml",
        currentStock: "20",
        lowStockThreshold: "30",
        isActive: true,
        stockMovements: [{ createdAt: new Date("2026-04-29T02:00:00.000Z") }],
      },
    ]);
    mocks.listReportProducts.mockResolvedValue([
      {
        id: "product-1",
        name: "Beans Bag",
        sku: "BEANS",
        stockQuantity: "0",
        lowStockThreshold: "5",
        isAvailable: true,
        stockMovements: [],
      },
    ]);
    mocks.listReportStockMovements.mockResolvedValue([
      {
        type: "sale_deduction",
        _count: { _all: 2 },
        _sum: { quantityChange: "-3" },
      },
    ]);
  });

  it("validates date ranges with store business-day boundaries", () => {
    const range = parseReportDateRange(
      new URL("http://localhost/api/reports/dashboard?dateFrom=2026-04-29&dateTo=2026-04-30"),
    );

    expect(range.dateFrom).toBe("2026-04-29");
    expect(range.dateTo).toBe("2026-04-30");
    expect(range.from.toISOString()).toBe("2026-04-28T17:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-04-30T17:00:00.000Z");
    expect(() =>
      parseReportDateRange(
        new URL("http://localhost/api/reports/dashboard?dateFrom=2026-04-30&dateTo=2026-04-29"),
      ),
    ).toThrow(ValidationError);
    expect(() =>
      parseReportDateRange(new URL("http://localhost/api/reports/dashboard?dateFrom=2026-02-31")),
    ).toThrow(ValidationError);
    expect(() =>
      parseReportDateRange(
        new URL("http://localhost/api/reports/dashboard?dateFrom=2026-01-01&dateTo=2026-02-15"),
      ),
    ).toThrow(ValidationError);
  });

  it("aggregates daily sales, payments, products, stock, and cashiers", async () => {
    mocks.listReportOrders.mockResolvedValue([
      buildOrder({
        refunds: [{ id: "refund-1", amount: "25000" }],
      }),
      buildOrder({
        id: "order-2",
        orderNumber: "ORD-002",
        cashierId: "cashier-2",
        totalAmount: "50000",
        subtotalAmount: "50000",
        discountAmount: "0",
        taxAmount: "0",
        serviceChargeAmount: "0",
        cashier: {
          id: "cashier-2",
          name: "Adi",
          email: "adi@pos.local",
        },
        payments: [
          {
            id: "payment-2",
            method: "qris",
            status: "paid",
            amount: "50000",
            paidAt,
          },
        ],
        refunds: [],
        items: [
          {
            id: "item-3",
            productId: "product-1",
            variantId: null,
            productNameSnapshot: "Latte",
            variantNameSnapshot: null,
            quantity: "1",
            unitPrice: "50000",
            discountAmount: "0",
            lineTotal: "50000",
            createdAt: paidAt,
          },
        ],
      }),
    ]);

    const range = parseReportDateRange(
      new URL("http://localhost/api/reports/dashboard?dateFrom=2026-04-29&dateTo=2026-04-29"),
    );
    const report = await getDashboardReport(
      new URL("http://localhost/api/reports/dashboard?dateFrom=2026-04-29&dateTo=2026-04-29"),
    );

    expect(report.dailySales).toMatchObject({
      grossSales: 150000,
      discountAmount: 10000,
      taxAmount: 9000,
      serviceChargeAmount: 1000,
      refundAmount: 25000,
      netSales: 125000,
      orderCount: 2,
      averageOrderValue: 62500,
    });
    expect(report.paymentSummary).toEqual([
      {
        method: "cash",
        salesAmount: 100000,
        refundAmount: 25000,
        netAmount: 75000,
        paymentCount: 1,
      },
      {
        method: "qris",
        salesAmount: 50000,
        refundAmount: 0,
        netAmount: 50000,
        paymentCount: 1,
      },
    ]);
    expect(report.topProducts[0]).toMatchObject({
      productId: "product-1",
      productName: "Latte",
      quantitySold: 3,
      grossRevenue: 140000,
      netRevenue: 117500,
    });
    expect(report.stockReport.summary).toMatchObject({
      activeStockItems: 2,
      lowStockCount: 1,
      outOfStockCount: 1,
      movementCount: 2,
    });
    expect(report.cashierReport).toEqual([
      expect.objectContaining({
        cashierId: "cashier-1",
        grossSales: 100000,
        refundAmount: 25000,
        netSales: 75000,
        refundCount: 1,
      }),
      expect.objectContaining({
        cashierId: "cashier-2",
        grossSales: 50000,
        refundAmount: 0,
        netSales: 50000,
        refundCount: 0,
      }),
    ]);
    expect(report.orderDetails[0]).toMatchObject({
      orderNumber: "ORD-001",
      paymentMethod: "cash",
      refundAmount: 25000,
    });
    expect(range.dateFrom).toBe("2026-04-29");
  });

  it("rejects dashboard reports when reporting is disabled", async () => {
    const { ForbiddenError } = await import("@/lib/api-response");
    mocks.requireModuleEnabled.mockRejectedValueOnce(
      new ForbiddenError("Reporting module is disabled."),
    );

    await expect(
      getDashboardReport(new URL("http://localhost/api/reports/dashboard")),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(mocks.listReportOrders).not.toHaveBeenCalled();
  });
});
