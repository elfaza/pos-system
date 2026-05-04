# 09 - Development Roadmap

## Roadmap Overview

The POS MVP is organized into six milestones. Each milestone builds on the previous one and should be validated before the next milestone expands the workflow.

## Timeline

| Milestone | Duration | Goal |
| --- | --- | --- |
| 1 | 1 to 1.5 months | Core POS engine and transaction foundation |
| 2 | 2 weeks | Inventory system |
| 3 | 2 weeks | Cash payment and receipt completion |
| 4 | 2 weeks | Queue and kitchen workflow |
| 5 | 2 weeks | Owner dashboard and reports |
| 6 | 1 to 2 weeks | Polish, performance, deployment, and release QA |

## Milestone Dependencies

```text
Milestone 1: Core schema, auth, catalog, orders
  -> Milestone 2: Inventory depends on products and orders
  -> Milestone 3: Payment depends on checkout and order persistence
  -> Milestone 4: Queue/kitchen depends on paid order finalization
  -> Milestone 5: Dashboard depends on paid orders, payments, inventory, kitchen
  -> Milestone 6: Polish depends on complete MVP workflows
```

## Milestone 1: Core POS Engine And Transaction

Focus:

- Project setup.
- Database foundation.
- Authentication.
- Admin/cashier roles.
- Catalog and settings.
- POS cart and held orders.
- Order persistence.

Done when:

- Admin and cashier can log in.
- Admin can manage catalog foundations.
- Cashier can operate POS basics.
- Orders and order items are persisted with snapshots.

## Milestone 2: Inventory System

Focus:

- Ingredient inventory.
- Product recipes.
- Stock deduction.
- Low-stock alerts.
- Adjustments and waste.
- Stock history.

Done when:

- Paid sales deduct stock.
- Insufficient stock blocks checkout.
- Admin can inspect and adjust inventory.

## Milestone 3: Payment System

Focus:

- Cash payment modal.
- Payment finalization.
- Payment records.
- Receipt content and print flow.

Done when:

- Cashier can complete cash payment.
- Receipt data remains reliable.
- Payment records reconcile with paid orders.

## Milestone 4: Queue And Kitchen

Focus:

- Daily queue number assignment.
- Kitchen order display.
- Status transitions.
- Ready queue display.

Done when:

- Paid orders receive queue numbers.
- Kitchen can move orders from received to completed.
- Queue display reflects active preparation state.

## Milestone 5: Dashboard

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

## Milestone 6: Polish

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
- Cash payment only as active payment workflow.
- QRIS reserved for future work.
- No split payments.
- No native mobile app.
- No hardware integration.
