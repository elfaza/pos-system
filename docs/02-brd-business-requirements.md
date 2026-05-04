# 02 - BRD: Business Requirements

## Business Objective

Deliver a reliable single-store cafe POS MVP that helps a cafe run daily sales, inventory, kitchen preparation, owner reporting, and operational accounting from one system.

## Business Goals

- Reduce checkout friction for cashiers.
- Maintain accurate paid order and receipt records.
- Track ingredient stock movements after sales, adjustments, and waste.
- Give kitchen staff a clear queue of paid orders.
- Give owners daily visibility into sales, top products, stock health, and cashier performance.
- Give owners basic visibility into cash movement, expenses, and daily close differences.
- Keep deployment and operations simple for an early-stage product.

## Business Users

| User | Business Need |
| --- | --- |
| Admin | Configure the store, control users, manage catalog and inventory, view reports |
| Cashier | Process customer orders, payments, receipts, held orders, and order pickup |
| Kitchen staff | Prepare paid orders in queue order and update status |
| Owner/operator | Understand business performance, cash movement, expenses, daily close records, and keep the application running |

## Functional Business Requirements

### Authentication And Access

- Users must log in with email and password.
- Sessions must be stored in httpOnly cookies.
- Roles must be limited to `admin` and `cashier` in the MVP.
- Inactive users must not be allowed to log in.
- Admin-only workflows must be blocked from cashiers in both UI and API.

### Catalog Management

- Admin can manage categories, products, variants, pricing, images, availability, and stock tracking flags.
- Cashier can browse only active categories and available products.
- Product and variant names/prices must be snapshotted into order items for historical accuracy.

### Checkout

- Cashier can add items to cart, update quantity, add notes, apply supported item discounts, hold orders, resume held orders, and cancel eligible unpaid orders.
- Checkout must use server-authoritative pricing and settings.
- Tax and service charge are calculated from store settings at checkout.
- Product prices are stored before tax and service charge.
- One order uses one payment method only.

### Payment

- MVP supports cash payment.
- Cash received must be greater than or equal to the order total.
- Change must be calculated and persisted.
- Server-side payment status is the source of truth.
- Payment records must not be deleted after orders are paid.
- QRIS fields can remain reserved for future integration.
- Refund tables, settings, statuses, and reporting support may exist as reserved data structures, but active refund processing is not part of the current implemented workflow.

### Inventory

- Admin can manage ingredient inventory and product recipes.
- Paid checkout deducts ingredient stock after payment confirmation.
- Held and cancelled unpaid orders do not deduct or reserve stock.
- Negative stock is blocked by default.
- Adjustments and waste require an admin and a reason.
- Every stock quantity change must create a stock movement record.

### Queue And Kitchen

- Paid orders receive daily queue numbers.
- Queue numbers are unique per business date.
- Paid orders enter kitchen status as `received`.
- Valid kitchen status lifecycle is `received`, `preparing`, `ready`, `completed`.
- Backward kitchen transitions are blocked in the MVP.
- Kitchen status is separate from order payment/refund status.

### Dashboard And Reporting

- Admin can view daily sales, payment summary, top products, stock report, and cashier report.
- Cashier cannot access owner dashboard reports.
- Reports must be calculated from persisted server data.
- Paid orders are included in sales reporting.
- Held, draft, cancelled unpaid, failed payment, and expired payment orders are excluded.
- Existing refund records must be shown separately so revenue is not overstated.

### Accounting

- Admin can manage chart of accounts, expenses, cash movements, journal entries, and daily close records.
- Paid POS orders remain the source of truth for sales.
- Accounting entries must not mutate paid orders, payments, receipts, inventory, or kitchen/queue state.
- Journal entries must balance.
- Cashier users cannot access accounting workflows.
- Tax filing, payroll, bank reconciliation, and audited financial statements are out of scope.

## Non-Functional Requirements

| Area | Requirement |
| --- | --- |
| Availability | Online-only MVP; mutation actions require network connectivity |
| Performance | POS, checkout, kitchen, queue, and dashboard must feel responsive with realistic MVP data sizes |
| Maintainability | Modular monolith with feature-oriented boundaries |
| Security | Password hashes only, httpOnly session cookies, role checks on server routes |
| Auditability | Activity logs, stock movements, order/payment persistence, and immutable paid records |
| Accounting Integrity | Balanced journal entries, traceable source references, and immutable POS history |
| Usability | Touch-friendly cashier workflow and responsive admin screens |
| Deployment | Production-like setup must support Prisma migrations, build, and start commands |

## Business Rules

- Stock deduction happens only after payment is confirmed.
- Sale stock deduction must happen exactly once per paid order.
- Held orders do not reserve inventory.
- Full refund data is supported by the model for future workflow/reporting use; active refund processing is not implemented in the current MVP.
- Partial refunds are out of scope.
- Queue numbers are assigned only after successful payment.
- Failed checkout must not consume a queue number.
- Reporting uses paid time and store business date.
- Accounting uses persisted POS source references and store business date.
- Monetary calculations must use decimal-safe helpers and persisted totals.

## Acceptance Criteria

- Admin can configure the store and manage the operational data needed for checkout.
- Cashier can complete a full cash checkout and receipt flow.
- Paid order appears in kitchen/queue workflows.
- Inventory is reduced when paid items have recipes.
- Dashboard shows reliable owner-level summaries.
- Accounting shows reliable cash, expense, journal, and close records.
- Cashier cannot access admin-only modules.
- Release validation commands and manual QA checklist are documented.
