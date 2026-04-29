export interface ReportDateRange {
  dateFrom: string;
  dateTo: string;
}

export interface DailySalesSummary {
  grossSales: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  refundAmount: number;
  netSales: number;
  orderCount: number;
  averageOrderValue: number;
}

export interface PaymentSummaryItem {
  method: "cash" | "qris";
  salesAmount: number;
  refundAmount: number;
  netAmount: number;
  paymentCount: number;
}

export interface ReportOrderDetail {
  id: string;
  orderNumber: string;
  paidAt: string | null;
  cashierName: string;
  paymentMethod: "cash" | "qris" | null;
  paymentStatus: string | null;
  totalAmount: number;
  refundAmount: number;
  status: string;
  queueNumber: number | null;
  kitchenStatus: string | null;
}

export interface TopProductReportItem {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  quantitySold: number;
  refundedQuantity: number;
  grossRevenue: number;
  discountAmount: number;
  refundAmount: number;
  netRevenue: number;
}

export interface StockReportSummary {
  activeStockItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  movementCount: number;
  saleDeductionCount: number;
  adjustmentCount: number;
  wasteCount: number;
  refundRestoreCount: number;
}

export interface StockMovementSummaryItem {
  type: "sale_deduction" | "adjustment" | "waste" | "refund_restore";
  movementCount: number;
  totalQuantityChange: number;
}

export interface StockReportItem {
  id: string;
  kind: "ingredient" | "product";
  name: string;
  unit: string;
  currentStock: number;
  lowStockThreshold: number | null;
  status: "ok" | "low" | "out" | "inactive";
  isActive: boolean;
  lastMovementAt: string | null;
}

export interface CashierReportItem {
  cashierId: string;
  cashierName: string;
  orderCount: number;
  grossSales: number;
  refundAmount: number;
  netSales: number;
  averageOrderValue: number;
  refundCount: number;
}

export interface DashboardReport {
  dateRange: ReportDateRange;
  dailySales: DailySalesSummary;
  paymentSummary: PaymentSummaryItem[];
  topProducts: TopProductReportItem[];
  stockReport: {
    summary: StockReportSummary;
    movementSummary: StockMovementSummaryItem[];
    items: StockReportItem[];
  };
  cashierReport: CashierReportItem[];
  orderDetails: ReportOrderDetail[];
}
