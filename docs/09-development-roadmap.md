# 09 - Development Roadmap

## Roadmap Overview

The POS MVP is delivered as a set of integrated product modules. Each module should be validated against the numbered docs before another module expands the workflow.

## Delivery Sequence

| Sequence | Module | Goal |
| --- | --- | --- |
| 1 | Core POS engine | Auth, catalog, settings, orders, and cashier foundation |
| 2 | Inventory | Ingredient stock, recipes, stock validation, and movement history |
| 3 | Payment and receipt | Cash checkout, payment records, and receipt reprint |
| 4 | Queue and kitchen | Daily queue numbers and kitchen preparation status |
| 5 | Dashboard and reports | Owner sales, stock, product, and cashier summaries |
| 6 | Accounting | Cash ledger, sales journals, expenses, and daily close records |
| 7 | Release polish | Responsive UI, performance, deployment, and release QA |

## Module Dependencies

```text
Core POS engine: auth, catalog, settings, orders
  -> Inventory depends on products and paid order timing
  -> Payment and receipt depends on checkout and order persistence
  -> Queue/kitchen depends on paid order finalization
  -> Dashboard/reports depends on paid orders, payments, inventory, kitchen
  -> Accounting depends on paid orders, payments, expenses, cash movement, and admin permissions
  -> Release polish depends on complete MVP workflows
```

## Core POS Engine

Focus:

- Project setup.
- Database foundation.
- Authentication.
- Admin/cashier roles.
- Catalog and settings.
- POS cart and held orders.
- Required order type before product selection.
- Dine-in table context and delivery metadata.
- Order persistence.

Done when:

- Admin and cashier can log in.
- Admin can manage catalog foundations.
- Cashier can operate POS basics.
- Orders and order items are persisted with snapshots.

## Inventory

Focus:

- Ingredient inventory.
- Product recipes.
- Product option groups and option values.
- Option value extra ingredient recipes.
- Option value ingredient replacement rules.
- Stock deduction.
- Low-stock alerts.
- Adjustments and waste.
- Stock history.

Done when:

- Paid sales deduct stock.
- Insufficient stock blocks checkout.
- Option add-ons and substitutions affect stock validation and deductions.
- Admin can inspect and adjust inventory.

## Payment And Receipt

Focus:

- Cash and manual QRIS payment modal.
- Payment finalization.
- Payment records.
- Receipt content and print flow.

Done when:

- Cashier can complete cash or manual QRIS payment.
- Receipt data remains reliable.
- Payment records reconcile with paid orders.

## Phase 3 Current Feature Slice

Implemented behavior:

- Admin can configure dining tables in `Dashboard > Tables`.
- POS supports dine-in table selection.
- POS supports delivery customer name, phone, address, and notes.
- Settings include `Dine-in pay later`.
- When dine-in pay later is disabled, dine-in orders must be paid immediately.
- When dine-in pay later is enabled, the existing hold/resume flow acts as the unpaid open-order workflow.
- Product options replace legacy variant checkout behavior.
- Option values can add ingredients on top of the base recipe.
- Option values can replace base recipe ingredients with another ingredient.

Examples:

- `Extra Shot` should use extra ingredient recipe, because it adds more espresso beans.
- `Oat Milk` should use replacement rule, because it replaces fresh milk with oat milk.
- `Large` can use extra ingredient recipes if it consumes more raw ingredients.

## Queue And Kitchen

Focus:

- Daily queue number assignment.
- Kitchen order display.
- Kitchen ticket payloads for future label printing.
- Status transitions.
- Ready queue display.

Done when:

- Paid orders receive queue numbers.
- Kitchen can move orders from received to completed.
- Kitchen tickets include order type, table/delivery context, item notes, and selected options.
- Queue display reflects active preparation state.

## Phase 4 Current Feature Slice

Implemented behavior:

- KDS displays order type, table/customer context, item notes, and selected options.
- Public queue display includes order type and table/customer context.
- Kitchen ticket API exposes print-ready ticket data at `/api/kitchen/orders/[id]/ticket`.
- Ticket data is prepared for future thermal label printing, but no automatic printer integration is active yet.

## Dashboard And Reports

Focus:

- Daily sales.
- Payment summary.
- Top products.
- Stock report.
- Cashier report.
- Date filtering.

Done when:

- Admin can review operational business summaries.
- Cashier cannot access reports.
- Reports use persisted transaction data.

## Accounting

Focus:

- Chart of accounts.
- Sales journal generation from paid orders.
- Cash ledger for cash sales and manual cash movements.
- Expense recording.
- Daily close reconciliation.
- Accounting reports.

Done when:

- Admin can review accounting entries tied to POS activity.
- Cash sales create auditable accounting records without mutating paid orders.
- Expenses and cash movements are tracked with categories, reasons, and actor metadata.
- Daily close records compare expected and counted cash.

## Release Polish

Focus:

- Touchscreen improvements.
- Responsive layouts.
- Performance review.
- Deployment readiness.
- QA validation.
- Documentation.

Done when:

- Release validation commands pass.
- Manual QA checklist is complete.
- Documentation matches current app behavior.
- Critical workflows are production-ready for MVP use.

## Release Strategy

1. Complete feature implementation.
2. Run automated tests.
3. Run lint and build.
4. Validate database migration flow.
5. Execute manual QA checklist.
6. Review documentation and known limitations.
7. Deploy to production-like environment.
8. Smoke test deployed environment.

## Release Validation Commands

```bash
npm run prisma:generate
npm test
npm run lint
npm run build
```

## Current MVP Limitations To Preserve

- Single-store only.
- Online-only operation.
- Admin/cashier roles only.
- Cash and manual QRIS are active payment workflows.
- QRIS is manual cashier confirmation only; no gateway, callback, settlement status, or bank reconciliation workflow.
- No split payments.
- No active refund processing workflow.
- No native mobile app.
- No hardware printer integration.
- No tax filing, payroll, or bank reconciliation.
