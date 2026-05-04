# 07 - MVP Scope And Backlog

## MVP Definition

The MVP is a production-ready single-store, online-only cafe POS with admin management, cashier checkout, cash payment, inventory, kitchen queue, owner dashboard, deployment documentation, and QA coverage.

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
- Owner dashboard and reports.
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
- Accounting-grade reporting.
- Internationalization.

## Milestone Backlog

### Milestone 1: Core POS Engine And Transaction

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
- Schema supports future inventory, payment, queue, and reports.

### Milestone 2: Inventory System

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

### Milestone 3: Payment System

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

### Milestone 4: Queue And Kitchen

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

### Milestone 5: Dashboard

Goal: provide owner-level operational reports.

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

### Milestone 6: Polish

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
| P0 | Required for paid checkout, data correctness, auth, inventory safety, or release |
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
- Production migration and build validation.

## P1 Work Items

- Held orders.
- Kitchen display.
- Queue display.
- Stock adjustment and waste.
- Order/payment history.
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
