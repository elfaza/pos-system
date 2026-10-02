import { beforeEach, describe, expect, it, vi } from "vitest";
import { listReportIngredients, listReportOrders, listReportProducts, listReportStockMovements } from "../repositories/reporting-repository";

const mocks = vi.hoisted(() => ({ orderFindMany: vi.fn(), ingredientFindMany: vi.fn(), productFindMany: vi.fn(), stockGroupBy: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  order: { findMany: mocks.orderFindMany }, ingredient: { findMany: mocks.ingredientFindMany },
  product: { findMany: mocks.productFindMany }, stockMovement: { groupBy: mocks.stockGroupBy },
} }));

describe("reporting repository tenant scope", () => {
  beforeEach(() => vi.clearAllMocks());

  it("restricts every report source to the active organization and outlet", async () => {
    const context = { userId: "owner-1", organizationId: "org-a", outletId: "outlet-a", role: "owner" as const };
    const dates = { paidFrom: new Date("2026-10-01"), paidTo: new Date("2026-10-02") };
    await listReportOrders(context, dates);
    await listReportIngredients(context);
    await listReportProducts(context);
    await listReportStockMovements(context, { dateFrom: dates.paidFrom, dateTo: dates.paidTo });

    expect(mocks.orderFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-a", outletId: "outlet-a" }) }));
    expect(mocks.ingredientFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-a" }, include: expect.objectContaining({ outletStocks: { where: { outletId: "outlet-a" }, take: 1 } }) }));
    expect(mocks.productFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-a", trackStock: true }, include: expect.objectContaining({ outletProducts: { where: { outletId: "outlet-a" }, take: 1 } }) }));
    expect(mocks.stockGroupBy).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-a", outletId: "outlet-a" }) }));
  });
});
