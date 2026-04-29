# 🚀 Milestone 5: Dashboard (2 Weeks)

## 🎯 Focus

Build the owner dashboard for the café POS so admin users can understand daily sales, best-selling products, inventory health, and cashier performance from reliable persisted transaction data.

---

## 🧭 Scope Rules

- MVP remains single-store only.
- MVP remains online-only. Dashboard and report data require active internet.
- Roles remain limited to `admin` and `cashier`.
- Admin can view all dashboard and report data.
- Cashier cannot access owner dashboard reports.
- Reports use server-side persisted orders, payments, order items, users, products, and stock data as the source of truth.
- Paid orders are included in sales reports.
- Cancelled unpaid, held, draft, failed payment, and expired payment orders are excluded from sales totals.
- Refunded orders must be represented clearly so owner totals do not overstate real revenue.
- Dashboard metrics are operational business summaries, not accounting-grade financial statements.
- Export, forecasting, multi-store comparison, and advanced analytics are out of scope.

---

## 🧱 WBS 5.0: Dashboard

---

### 5.1 📊 Dashboard Overview

- **5.1.1 Owner Dashboard Entry**
  - Admin can access dashboard from the admin navigation.
  - Dashboard shows the selected business date or date range clearly.
  - Default view uses the current business date in the store timezone.
  - Dashboard includes daily sales, top products, stock report summary, and cashier report summary.
  - Dashboard supports loading, empty, error, and offline states.

- **5.1.2 Date Filtering**
  - Admin can filter reports by business date.
  - Admin can select a date range for reports that support historical review.
  - Date range must have a clear maximum or pagination strategy if the dataset can grow large.
  - Invalid date ranges are rejected by API validation.

- **5.1.3 Metric Reliability**
  - Dashboard totals must be calculated on the server.
  - Client-side calculations are allowed only for presentation of already returned server values.
  - Dashboard data must refresh after filter changes.
  - Stale or failed refreshes must show a clear error without replacing valid existing data with misleading zeros.

---

### 5.2 💰 Daily Sales

- **5.2.1 Sales Summary**
  - Show gross sales for paid orders.
  - Show discounts.
  - Show tax amount.
  - Show service charge amount.
  - Show net sales after refunds where refund data exists.
  - Show total order count.
  - Show average order value.

- **5.2.2 Payment Summary**
  - Show cash sales total.
  - Show QRIS sales total only if QRIS payments exist in the system.
  - Show refunded amount separately from sales amount.
  - Show payment count by method.
  - Payment method totals must reconcile with included paid payment records.

- **5.2.3 Daily Sales Detail**
  - Admin can inspect daily order/payment rows behind the summary.
  - Detail rows show order number, paid time, cashier, payment method, total, refund state, and kitchen/queue status when available.
  - Detail rows use persisted snapshots for historical item names and totals.

---

### 5.3 🏆 Top Products

- **5.3.1 Best-Selling Product Ranking**
  - Show top products by quantity sold.
  - Show top products by revenue.
  - Ranking uses paid order item snapshots.
  - Refunded orders or refunded line amounts must be represented according to available refund data.
  - Product names remain historical even if the current catalog name changes.

- **5.3.2 Product Metrics**
  - Show product name, variant name when applicable, quantity sold, gross revenue, discounts, and net revenue.
  - Support configurable limit or a sensible default such as top 10.
  - Product ranking must handle deleted or inactive products through order item snapshots.

- **5.3.3 Empty And Edge States**
  - No paid sales in the selected period shows an empty state, not an error.
  - Products with equal ranking values use deterministic secondary sorting.
  - Long product and variant names must wrap without overlapping table controls.

---

### 5.4 📦 Stock Report

- **5.4.1 Current Stock Summary**
  - Show total active stock-tracked products or ingredients, depending on the active inventory model.
  - Show low-stock count.
  - Show out-of-stock count.
  - Show recent stock movement count for the selected period.

- **5.4.2 Stock Report Table**
  - Admin can view current stock level, unit, low-stock threshold, status, and last movement date.
  - Admin can filter by low stock, out of stock, active, and inactive where those states exist.
  - Admin can sort by stock level, status, and last movement date.
  - Stock report links to the relevant product, ingredient, or inventory detail screen when available.

- **5.4.3 Stock Movement Summary**
  - Show stock decreases caused by sales.
  - Show stock adjustments.
  - Show waste movements if waste tracking exists.
  - Show refund restoration movements if refund restoration exists.
  - Movement totals must come from persisted stock movement records.

---

### 5.5 👤 Cashier Report

- **5.5.1 Cashier Performance Summary**
  - Show sales by cashier for the selected date or date range.
  - Show order count by cashier.
  - Show average order value by cashier.
  - Show refund count and refunded amount by cashier where refund data exists.

- **5.5.2 Cashier Detail**
  - Admin can inspect orders handled by a cashier.
  - Detail rows show order number, paid time, payment method, total, refund state, and queue number when available.
  - Cashier report must use the order cashier assignment stored at checkout time.

- **5.5.3 Permission Boundary**
  - Cashiers cannot view other cashiers' performance reports.
  - Cashiers can continue viewing only operational order/payment history already allowed by previous milestones.
  - Server-side authorization must enforce admin-only access for cashier performance endpoints.

---

### 5.6 🗄️ Database Tables

Milestone 5 should prefer aggregating from existing persisted transaction, payment, order item, refund, stock movement, product, and user tables. New reporting tables should only be introduced if query performance or snapshot correctness requires them.

#### Existing Data Sources

| Data Source | Purpose | Required For |
| --- | --- | --- |
| `orders` | Order status, cashier, totals, paid time, queue state | daily sales, cashier report |
| `order_items` | Product and variant snapshots, quantities, line totals | top products, sales detail |
| `payments` | Payment method, payment status, paid amount, paid time | daily sales, payment summary |
| `refunds` | Refund amount, status, reason, processed time | net sales, cashier refund metrics |
| `products` / inventory tables | Current stock and active state | stock report |
| `stock_movements` | Stock deductions, adjustments, waste, restorations | stock movement summary |
| `users` | Cashier identity | cashier report |

#### Optional New Reporting Views Or Helpers

| Object | Purpose | Notes |
| --- | --- | --- |
| `reporting` service layer | Centralize aggregation rules | Preferred before adding new tables |
| Database view | Improve repeated read queries | Only if Prisma/project pattern supports it cleanly |
| Materialized summary table | Cache expensive report totals | Out of scope unless performance requires it |

Rules:
- Reporting logic must not mutate source transaction data.
- Historical sales reports must use persisted order and item snapshots.
- Monetary values must use existing decimal-safe helpers.
- Report queries must avoid loading unbounded row sets into memory.

---

### 5.7 🔐 Roles & Permissions

| Workflow | Admin | Cashier | Notes |
| --- | --- | --- | --- |
| View owner dashboard | Yes | No | Admin-only business overview |
| View daily sales report | Yes | No | Cashier keeps operational history only |
| View top products report | Yes | No | Admin-only |
| View stock report | Yes | No | Admin inventory visibility |
| View cashier performance report | Yes | No | Admin-only staff performance |
| Export reports | No | No | Out of scope |

Rules:
- API authorization must enforce the same permissions as UI navigation.
- Report endpoints must require authenticated users.
- Cashier requests to report endpoints must return a forbidden response.
- Report responses must not expose password hashes, session data, or unrelated user-sensitive fields.

---

### 5.8 🧮 Reporting And Calculation Rules

- Business date should use the store timezone.
- Paid time is the primary timestamp for sales reporting.
- Gross sales includes paid order totals before refund subtraction.
- Net sales subtracts completed refund amounts when refund data exists.
- Discounts, tax, and service charge use persisted order values.
- Average order value = net sales divided by included paid order count unless the UI explicitly labels a gross average.
- Top product quantity uses sold item quantity from paid orders.
- Top product revenue uses persisted line totals and discounts from order items.
- Stock status:
  - Low stock when current stock is less than or equal to low-stock threshold.
  - Out of stock when current stock is less than or equal to zero.
  - Items without a threshold should not be counted as low stock unless already treated that way by inventory rules.
- Money values must be rounded and formatted through existing currency helpers.

---

### 5.9 🌐 Offline & Connectivity Rules

- Dashboard pages can show previously loaded data while offline.
- Report filters and refresh actions should be disabled or clearly fail while offline.
- Report data must not be calculated from partial offline client state.
- Failed report requests must show a clear error and preserve the last successful report view when possible.

---

### 5.10 🧪 Testing Requirements

- **5.10.1 Daily Sales Tests**
  - Paid orders are included in daily sales.
  - Held, cancelled unpaid, failed payment, and expired payment orders are excluded.
  - Refund amounts reduce net sales when completed refund data exists.
  - Payment method totals reconcile with paid payment records.
  - Date filters use the store business date.

- **5.10.2 Top Products Tests**
  - Products rank by quantity sold.
  - Products rank by revenue.
  - Product snapshots remain visible after catalog changes.
  - No-sales period returns an empty report state.

- **5.10.3 Stock Report Tests**
  - Low-stock and out-of-stock counts follow inventory rules.
  - Stock movement summary includes sale deductions.
  - Stock movement summary includes adjustments and waste where available.
  - Cashier cannot access stock report endpoints.

- **5.10.4 Cashier Report Tests**
  - Sales are grouped by order cashier.
  - Order count and average order value are calculated correctly.
  - Refund metrics are shown separately where refund data exists.
  - Cashier cannot access cashier performance reports.

- **5.10.5 Frontend Workflow Tests**
  - Dashboard loading, empty, error, offline, and populated states.
  - Date filter changes refresh dashboard data.
  - Report tables handle long product names, cashier names, and empty values.
  - Admin-only navigation hides dashboard report links from cashier users.

---

## ✅ Milestone Output

After completing this milestone, the system will allow:

- Owner/admin to view daily sales totals and payment summaries.
- Owner/admin to identify top-selling products by quantity and revenue.
- Owner/admin to monitor current stock, low-stock, out-of-stock, and movement summaries.
- Owner/admin to review cashier sales performance.
- Dashboard report APIs to calculate metrics from server-side persisted data.
- Cashier users to remain blocked from owner reporting surfaces.

Goal: owner can manage the business.

---

## 🚫 Explicitly Out of Scope for Milestone 5

- Weekly sales dashboard
- Monthly sales dashboard
- Accounting-grade profit and loss
- Cost of goods sold reporting
- Ingredient cost reporting
- Forecasting
- Multi-store comparison
- Report export to CSV, Excel, or PDF
- Scheduled email reports
- Custom report builder
- Realtime dashboard updates
- Customer analytics
- Loyalty analytics
- QRIS provider settlement reconciliation
- Payroll
- Advanced staff performance scoring
