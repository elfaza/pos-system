# 10 - QA Test Plan

## QA Objective

Validate that the POS MVP is reliable for daily cafe operations across authentication, catalog, checkout, payment, inventory, kitchen, queue, reporting, accounting, responsive UI, and deployment readiness.

## Test Types

| Type | Purpose |
| --- | --- |
| Unit tests | Validate business calculations and service rules |
| Integration tests | Validate service and repository workflows with realistic data boundaries |
| Route/API tests | Validate authorization, validation, and response behavior |
| UI/manual tests | Validate operational workflows, responsive behavior, and touch usability |
| Release checks | Validate build, lint, tests, Prisma generation, and migration readiness |

## Automated Test Areas

### Authentication

- Login succeeds with active valid user.
- Login rejects invalid password.
- Login rejects inactive user.
- Session validation accepts valid session.
- Revoked or expired session is rejected.
- Cashier cannot access admin services.

### Catalog

- Product creation validates price and category.
- Variant price delta is applied correctly.
- Cashier product list hides inactive or unavailable records where required.
- Product responses do not leak internal-only fields.

### Checkout Calculation

- Subtotal equals sum of item line values.
- Discounts reduce line or order totals according to supported rules.
- Tax is applied only when enabled.
- Service charge is applied only when enabled.
- Total uses decimal-safe rounding.

### Cash Checkout

- Empty cart is rejected.
- Unavailable product is rejected.
- Cash received below total is rejected.
- Exact cash payment succeeds.
- Overpaid cash payment succeeds and stores change.
- Paid checkout creates order, items, and payment.
- Paid checkout deducts stock exactly once.
- Failed checkout does not assign queue number.

### Inventory

- Ingredient create/update validation works.
- Recipe quantity must be positive.
- Insufficient stock blocks checkout.
- Sale deduction creates stock movements.
- Adjustment increases/decreases stock and creates movement.
- Waste decreases stock and creates movement.
- Waste cannot reduce stock below zero.

### Kitchen And Queue

- Paid order receives queue number.
- Queue number is unique per business date.
- Paid order starts with kitchen status `received`.
- `received` can move to `preparing`.
- `preparing` can move to `ready`.
- `ready` can move to `completed`.
- Backward transitions are rejected.
- Cancelled or existing refunded orders reject kitchen updates.

### Reporting

- Paid orders are included in sales totals.
- Draft, held, cancelled unpaid, failed payment, and expired payment orders are excluded.
- Existing refund records reduce net sales where refund data exists.
- Top products use order item snapshots.
- Stock report follows low-stock and out-of-stock rules.
- Cashier cannot access admin report endpoint.

### Accounting

- Cashier cannot access accounting endpoints.
- Paid cash order is represented once in accounting.
- Journal entries balance.
- Expense creation validates category, amount, date, payment source, and description.
- Cash in/out validates amount, direction, date, and reason.
- Daily close is unique per business date.
- Daily close records expected cash, counted cash, and difference.
- Accounting reports use persisted accounting records and POS source references.

## Manual QA Checklist

Use [qa/release-checklist.md](qa/release-checklist.md) for release execution.

Minimum manual flows:

1. Admin login and logout.
2. Cashier login and logout.
3. Admin creates category, product, variant, ingredient, and recipe.
4. Cashier completes cash checkout with exact cash.
5. Cashier completes cash checkout with change.
6. Held order is created, resumed, and paid.
7. Held/cancelled unpaid order does not deduct stock.
8. Paid order appears in kitchen and queue.
9. Kitchen order moves through all valid statuses.
10. Receipt preview and reprint show persisted data.
11. Dashboard loads for admin.
12. Dashboard is blocked for cashier.
13. Admin records expense and sees it in accounting report.
14. Admin records cash movement and sees it in cash ledger.
15. Admin closes a business date.
16. Accounting is blocked for cashier.
17. Offline state disables checkout, kitchen, and accounting mutations.

## Responsive QA

Check POS and key screens at:

- `360px`
- `768px`
- `820px`
- `1024px`
- `1280px`

Acceptance:

- No uncontrolled horizontal page scroll.
- Cart actions remain reachable on tablet POS.
- Tables scroll intentionally on narrow screens.
- Long text does not overlap controls.
- Modals remain usable on short screens.

## Release Validation Commands

Run before release:

```bash
npm run prisma:generate
npm test
npm run lint
npm run build
```

## Defect Severity

| Severity | Definition |
| --- | --- |
| Blocker | Prevents login, checkout, payment, migration, build, or data integrity |
| High | Breaks admin/cashier role boundaries, stock correctness, kitchen workflow, accounting integrity, or reports |
| Medium | Significant UI, validation, or workflow issue with workaround |
| Low | Cosmetic or minor copy/layout issue that does not affect operation |

## Exit Criteria

- Release validation commands pass.
- Blocker and high defects are fixed.
- Manual QA checklist is complete.
- Known MVP limitations are documented.
- Deployment setup has been tested in a production-like environment.
