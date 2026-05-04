"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/features/admin/components/admin-shell";
import { formatRupiah } from "@/features/checkout/services/checkout-calculations";
import type { DashboardReport, StockReportItem } from "@/features/reporting/types";

function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatLabel(value: string | null) {
  if (!value) return "-";
  return value.replaceAll("_", " ");
}

function stockStatusClass(status: StockReportItem["status"]) {
  if (status === "out") return "border-[var(--danger)]/30 bg-red-50 text-[var(--danger)]";
  if (status === "low") return "border-[var(--warning)]/30 bg-orange-50 text-[var(--warning)]";
  if (status === "inactive") return "border-slate-200 bg-slate-100 text-[var(--muted-foreground)]";
  return "border-[var(--success)]/30 bg-green-50 text-[var(--success)]";
}

function SummaryCard({
  label,
  value,
  tone = "text-[var(--foreground)]",
  helper,
}: {
  label: string;
  value: string;
  tone?: string;
  helper?: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className={`mt-2 break-words text-2xl font-semibold tracking-tight ${tone}`}>{value}</p>
      {helper ? <p className="mt-1 break-words text-sm text-[var(--muted-foreground)]">{helper}</p> : null}
    </div>
  );
}

export default function DashboardPage() {
  const initialDate = useMemo(() => getTodayInputValue(), []);
  const [dateFrom, setDateFrom] = useState(initialDate);
  const [dateTo, setDateTo] = useState(initialDate);
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const loadReport = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!options.silent) setLoading(true);
      if (options.silent) setRefreshing(true);
      setError(null);

      try {
        const query = new URLSearchParams();
        if (dateFrom) query.set("dateFrom", dateFrom);
        if (dateTo) query.set("dateTo", dateTo);

        const response = await fetch(`/api/reports/dashboard?${query.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load dashboard report.");
        }

        setReport(data.report);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load dashboard report.",
        );
      } finally {
        if (!options.silent) setLoading(false);
        if (options.silent) setRefreshing(false);
      }
    },
    [dateFrom, dateTo],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsOnline(window.navigator.onLine);
      void loadReport();
    }, 0);

    function handleOnline() {
      setIsOnline(true);
      void loadReport({ silent: true });
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadReport]);

  const hasSales = Boolean(report && report.dailySales.orderCount > 0);

  return (
    <AdminShell title="Owner Dashboard" eyebrow="Admin reports">
      <div className="grid min-w-0 gap-5">
        {!isOnline ? (
          <div className="rounded-md border border-[var(--warning)]/30 bg-orange-50 p-3 text-sm text-[var(--warning)]">
            Connection lost. Reports use the last loaded data until the POS reconnects.
          </div>
        ) : null}
        {error ? (
          <div className="rounded-md border border-[var(--danger)]/30 bg-red-50 p-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        ) : null}

        <section className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="grid gap-1 text-sm font-medium">
              From
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="h-11 rounded-md border border-[var(--border)] bg-white px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              To
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="h-11 rounded-md border border-[var(--border)] bg-white px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              />
            </label>
            <button
              type="button"
              onClick={() => void loadReport()}
              disabled={!isOnline || loading || refreshing}
              className="h-11 rounded-md bg-[var(--primary)] px-4 font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading || refreshing ? "Loading..." : "Apply"}
            </button>
          </div>
          {report ? (
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">
              Showing {report.dateRange.dateFrom} to {report.dateRange.dateTo}
            </p>
          ) : null}
        </section>

        {loading ? (
          <section className="grid min-w-0 gap-3 md:grid-cols-4">
            {["Net sales", "Orders", "Average order", "Low stock"].map((label) => (
              <div
                key={label}
                className="h-28 animate-pulse rounded-md border border-[var(--border)] bg-white"
              />
            ))}
          </section>
        ) : report ? (
          <>
            <section className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Net sales"
                value={formatRupiah(report.dailySales.netSales)}
                tone="text-[var(--success)]"
                helper={`${formatRupiah(report.dailySales.grossSales)} gross`}
              />
              <SummaryCard
                label="Orders"
                value={formatNumber(report.dailySales.orderCount)}
                helper={`${formatRupiah(report.dailySales.averageOrderValue)} average`}
              />
              <SummaryCard
                label="Refunds"
                value={formatRupiah(report.dailySales.refundAmount)}
                tone="text-[var(--danger)]"
                helper="Completed refund records"
              />
              <SummaryCard
                label="Low stock"
                value={formatNumber(
                  report.stockReport.summary.lowStockCount +
                    report.stockReport.summary.outOfStockCount,
                )}
                tone="text-[var(--warning)]"
                helper={`${formatNumber(report.stockReport.summary.outOfStockCount)} out`}
              />
            </section>

            {!hasSales ? (
              <div className="rounded-md border border-dashed border-[var(--border)] bg-white p-6 text-sm text-[var(--muted-foreground)]">
                No paid sales were found for the selected date range.
              </div>
            ) : null}

            <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
                <div className="border-b border-[var(--border)] p-4">
                  <h2 className="font-semibold">Daily Sales</h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Server-calculated totals from paid orders and refunds.
                  </p>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  <SummaryCard label="Discounts" value={formatRupiah(report.dailySales.discountAmount)} />
                  <SummaryCard label="Tax" value={formatRupiah(report.dailySales.taxAmount)} />
                  <SummaryCard label="Service charge" value={formatRupiah(report.dailySales.serviceChargeAmount)} />
                  <SummaryCard label="Movement rows" value={formatNumber(report.stockReport.summary.movementCount)} />
                </div>
              </div>

              <div className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
                <div className="border-b border-[var(--border)] p-4">
                  <h2 className="font-semibold">Payment Summary</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                      <tr>
                        <th className="p-3">Method</th>
                        <th className="p-3 text-right">Payments</th>
                        <th className="p-3 text-right">Sales</th>
                        <th className="p-3 text-right">Refunds</th>
                        <th className="p-3 text-right">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.paymentSummary.map((payment) => (
                        <tr key={payment.method} className="border-t border-[var(--border)]">
                          <td className="p-3 font-medium uppercase">{payment.method}</td>
                          <td className="p-3 text-right">{formatNumber(payment.paymentCount)}</td>
                          <td className="p-3 text-right">{formatRupiah(payment.salesAmount)}</td>
                          <td className="p-3 text-right">{formatRupiah(payment.refundAmount)}</td>
                          <td className="p-3 text-right font-semibold">{formatRupiah(payment.netAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
              <div className="border-b border-[var(--border)] p-4">
                <h2 className="font-semibold">Top Products</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Refunded qty</th>
                      <th className="p-3 text-right">Gross</th>
                      <th className="p-3 text-right">Discounts</th>
                      <th className="p-3 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topProducts.length > 0 ? (
                      report.topProducts.map((product) => (
                        <tr
                          key={`${product.productId}:${product.variantId ?? "base"}`}
                          className="border-t border-[var(--border)]"
                        >
                          <td className="max-w-[280px] p-3">
                            <p className="break-words font-medium">{product.productName}</p>
                            {product.variantName ? (
                              <p className="break-words text-xs text-[var(--muted-foreground)]">
                                {product.variantName}
                              </p>
                            ) : null}
                          </td>
                          <td className="p-3 text-right">{formatNumber(product.quantitySold)}</td>
                          <td className="p-3 text-right">{formatNumber(product.refundedQuantity)}</td>
                          <td className="p-3 text-right">{formatRupiah(product.grossRevenue)}</td>
                          <td className="p-3 text-right">{formatRupiah(product.discountAmount)}</td>
                          <td className="p-3 text-right font-semibold">{formatRupiah(product.netRevenue)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-4 text-sm text-[var(--muted-foreground)]" colSpan={6}>
                          No product sales in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid min-w-0 gap-5 xl:grid-cols-2">
              <div className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
                <div className="border-b border-[var(--border)] p-4">
                  <h2 className="font-semibold">Stock Report</h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Current inventory with movement counts for the selected period.
                  </p>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  <SummaryCard label="Active items" value={formatNumber(report.stockReport.summary.activeStockItems)} />
                  <SummaryCard label="Sale deductions" value={formatNumber(report.stockReport.summary.saleDeductionCount)} />
                  <SummaryCard label="Adjustments" value={formatNumber(report.stockReport.summary.adjustmentCount)} />
                  <SummaryCard label="Waste" value={formatNumber(report.stockReport.summary.wasteCount)} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                      <tr>
                        <th className="p-3">Item</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Stock</th>
                        <th className="p-3 text-right">Threshold</th>
                        <th className="p-3">Last movement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.stockReport.items.slice(0, 12).map((item) => (
                        <tr key={`${item.kind}:${item.id}`} className="border-t border-[var(--border)]">
                          <td className="max-w-[220px] p-3">
                            <p className="break-words font-medium">{item.name}</p>
                            <p className="break-words text-xs text-[var(--muted-foreground)]">{item.kind}</p>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${stockStatusClass(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {formatNumber(item.currentStock)} {item.unit}
                          </td>
                          <td className="p-3 text-right">
                            {item.lowStockThreshold === null ? "-" : `${formatNumber(item.lowStockThreshold)} ${item.unit}`}
                          </td>
                          <td className="p-3">{formatDateTime(item.lastMovementAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
                <div className="border-b border-[var(--border)] p-4">
                  <h2 className="font-semibold">Cashier Report</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                      <tr>
                        <th className="p-3">Cashier</th>
                        <th className="p-3 text-right">Orders</th>
                        <th className="p-3 text-right">Gross</th>
                        <th className="p-3 text-right">Refunds</th>
                        <th className="p-3 text-right">Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.cashierReport.length > 0 ? (
                        report.cashierReport.map((cashier) => (
                          <tr key={cashier.cashierId} className="border-t border-[var(--border)]">
                            <td className="max-w-[220px] break-words p-3 font-medium">{cashier.cashierName}</td>
                            <td className="p-3 text-right">{formatNumber(cashier.orderCount)}</td>
                            <td className="p-3 text-right">{formatRupiah(cashier.grossSales)}</td>
                            <td className="p-3 text-right">{formatRupiah(cashier.refundAmount)}</td>
                            <td className="p-3 text-right">{formatRupiah(cashier.averageOrderValue)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="p-4 text-sm text-[var(--muted-foreground)]" colSpan={5}>
                            No cashier sales in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
              <div className="border-b border-[var(--border)] p-4">
                <h2 className="font-semibold">Sales Detail</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                    <tr>
                      <th className="p-3">Order</th>
                      <th className="p-3">Paid</th>
                      <th className="p-3">Cashier</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3">Kitchen</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3 text-right">Refund</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.orderDetails.length > 0 ? (
                      report.orderDetails.map((order) => (
                        <tr key={order.id} className="border-t border-[var(--border)]">
                          <td className="p-3 font-medium">
                            {order.orderNumber}
                            {order.queueNumber ? (
                              <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                                #{order.queueNumber}
                              </span>
                            ) : null}
                          </td>
                          <td className="p-3">{formatDateTime(order.paidAt)}</td>
                          <td className="p-3">{order.cashierName}</td>
                          <td className="p-3">
                            {formatLabel(order.paymentMethod)} / {formatLabel(order.paymentStatus)}
                          </td>
                          <td className="p-3">{formatLabel(order.kitchenStatus)}</td>
                          <td className="p-3 text-right">{formatRupiah(order.totalAmount)}</td>
                          <td className="p-3 text-right">{formatRupiah(order.refundAmount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-4 text-sm text-[var(--muted-foreground)]" colSpan={7}>
                          No paid order details in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--border)] bg-white p-6 text-sm text-[var(--muted-foreground)]">
            Dashboard report is not available.
          </div>
        )}
      </div>
    </AdminShell>
  );
}
