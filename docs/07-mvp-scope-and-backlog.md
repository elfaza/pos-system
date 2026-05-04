# 07 - MVP Scope And Backlog

## MVP Definition

The MVP is a production-ready single-store, online-only cafe POS with admin management, cashier checkout, cash payment, inventory, kitchen queue, owner dashboard, operational accounting, deployment documentation, and QA coverage.

## In Scope

- Admin and cashier authentication.
- Role-based access control.
- User management.
- Product categories, products, variants, and settings.
- Cashier POS with cart, search/filter, notes, discounts, held orders, and cash checkout.
- Receipt preview and reprint.
- Ingredient inventory, recipes, adjustments, waste, and stock movement history.
- Queue number assignment after payment.
- Kitchen display and status updates.
- Queue display.
- Owner dashboard and operational reports.
- Operational accounting for cash, sales journals, expenses, and daily close summaries.
- Responsive and touch-friendly UI polish.
- Deployment and QA documentation.

## Out Of Scope

- Multi-store support.
- Offline sync.
- QRIS/Midtrans live integration.
- Split payment.
- Active refund processing workflow.
- Partial refund.
- Table management.
- Customer accounts and loyalty.
- Native mobile apps.
- Hardware integrations.
- Tax filing.
- Payroll.
- Bank reconciliation.
- Audited accounting-grade financial statements.
- Internationalization.

## Module Backlog

### Core POS Engine And Transaction

Goal: establish the application foundation and core checkout model.

Backlog:

- Next.js, TypeScript, Tailwind, Prisma, PostgreSQL setup.
- Feature module structure.
- Authentication and session management.
- Admin and cashier role boundaries.
- Categories, products, variants, and settings.
- Cashier POS cart.
- Held orders.
- Order and payment schema foundation.
- Receipt model foundation.
- Online-only guards.

Output:

- Cashier can create and persist basic orders.
- Admin can manage foundational catalog and settings.
- Schema supports inventory, payment, queue, reporting, and accounting extension.

### Inventory System

Goal: add real ingredient inventory and stock auditability.

Backlog:

- Ingredient master data.
- Product and variant recipes.
- Admin inventory screen.
- Stock validation during checkout.
- Sale deduction after payment.
- Low-stock and out-of-stock states.
- Manual adjustment.
- Waste recording.
- Stock movement history.

Output:

- Paid sales deduct stock.
- Admin can inspect and correct inventory.
- Stock changes are auditable.

### Payment And Receipt

Goal: complete the cash payment and receipt flow.

Backlog:

- Cash payment modal.
- Cash received and change calculation.
- Payment finalization.
- Payment record persistence.
- Receipt content and print/reprint.
- Payment history visibility.
- QRIS schema reservation only.

Output:

- Cashier can complete paid cash checkout.
- Receipt shows reliable persisted transaction data.
- Payment records are complete for cash.

### Queue And Kitchen

Goal: support paid order preparation and pickup workflow.

Backlog:

- Daily queue number assignment.
- Queue display.
- Kitchen display.
- Kitchen status lifecycle.
- Ready state visibility.
- Activity logs for queue and kitchen events.

Output:

- Paid orders appear in kitchen.
- Staff can move orders through preparation and completion.
- Queue numbers are visible to cashier and customers.

### Dashboard And Operational Reports

Goal: provide owner-level operational summaries.

Backlog:

- Dashboard overview.
- Date filtering.
- Daily sales summary.
- Payment summary.
- Top products.
- Stock report.
- Cashier report.
- Admin-only report APIs.

Output:

- Admin can review sales, stock, products, and cashier performance.
- Reports are based on persisted transaction data.

### Accounting

Goal: provide owner/admin users with basic operational accounting that connects POS sales, cash movement, expenses, and daily close records without changing paid order history.

Backlog:

- Chart of accounts.
- Sales journal entries generated from paid orders.
- Cash ledger for cash sales, cash in, cash out, and closing balances.
- Expense categories and expense recording.
- Daily close workflow that reconciles expected cash against counted cash.
- Accounting reports for cash ledger, income/expense summary, and journal history.
- Admin-only accounting permissions and API routes.

Output:

- Admin can review accounting records tied to POS activity.
- Paid orders remain source of truth for sales.
- Accounting entries are auditable and do not mutate checkout history.

### Release Polish

Goal: make the MVP production-ready.

Backlog:

- Touchscreen POS polish.
- Responsive admin and operational screens.
- Performance review for high-use pages and APIs.
- Deployment readiness.
- QA checklist and release validation commands.
- Documentation cleanup.

Output:

- The app is ready for production-like validation and release.

## Priority Rules

| Priority | Definition |
| --- | --- |
| P0 | Required for paid checkout, data correctness, auth, inventory safety, accounting integrity, or release |
| P1 | Required for complete MVP operation but not a direct data integrity blocker |
| P2 | Useful polish or efficiency improvement |
| Deferred | Explicitly outside MVP |

## P0 Work Items

- Secure authentication and role checks.
- Product and settings management.
- Server-authoritative checkout calculation.
- Cash payment finalization.
- Stock validation and deduction.
- Queue assignment after payment.
- Receipt persistence and reprint.
- Dashboard report authorization.
- Accounting entry integrity for paid cash orders and expenses.
- Production migration and build validation.

## P1 Work Items

- Held orders.
- Kitchen display.
- Queue display.
- Stock adjustment and waste.
- Order/payment history.
- Accounting dashboard and ledger filters.
- Responsive admin pages.
- Activity logs.

## P2 Work Items

- Additional filters.
- UI density tuning.
- Report table refinements.
- More extensive empty/error states.
- Performance tuning where measured.

## Deferred Backlog

- QRIS/Midtrans integration.
- Split payments.
- Refund processing workflow.
- Multi-branch architecture.
- Offline order sync.
- Hardware receipt printer integration.
- Customer loyalty.
- Advanced analytics.
- Tax filing.
- Payroll.
- Bank reconciliation.
