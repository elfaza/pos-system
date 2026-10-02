# Phase 4 Review: Operational and Financial Tenancy

**Branch:** `feature/multi-tenant-organizations-outlets`  
**Scope:** Plan Tasks 12–15  
**Status:** Complete; waiting for review before Phase 5.

## Task 12 — Checkout, orders, tables, and receipts

Checkout now resolves a trusted tenant context before reading catalog data or writing an order. Product availability and stock come from the selected outlet. Tables, held orders, order history, cancellation, and refund lookup all include the active organization and outlet in their predicates. New orders, payments, stock movements, and activity entries retain their tenant IDs.

Checkout deducts outlet balances conditionally in the same transaction as order creation. The database rejects checkout if the balance changed or is no longer sufficient. Refunds are full-order refunds; they update the payment and order, write a reversal journal entry, and restore only that order's outlet stock when the outlet setting enables automatic restoration.

```ts
const balanceUpdate = await tx.outletProduct.updateMany({
  where: {
    outletId: tenant.outletId,
    productId: item.productId,
    stockQuantity: { gte: new Prisma.Decimal(item.quantity) },
  },
  data: { stockQuantity: { decrement: new Prisma.Decimal(item.quantity) } },
});
if (balanceUpdate.count !== 1) {
  throw new ValidationError("Insufficient stock for checkout.");
}
```

Order numbers include an outlet tag. Queue allocation uses an advisory transaction lock keyed by outlet and business date. Dining table creation, listing, and updates are also outlet-scoped. The receipt format is unchanged; its order lookup and settings now use the selected tenant.

## Task 13 — Kitchen, queue, and customer display

Kitchen boards, queue displays, order lookups, and status changes are filtered by the tenant context and persisted order outlet. Customer-display state uses an organization/outlet-specific key and stores those tenant IDs. Display-device access continues to derive from explicit outlet membership.

```ts
where: {
  id,
  organizationId: tenant.organizationId,
  outletId: tenant.outletId,
  status: "paid",
  queueNumber: { not: null },
}
```

## Task 14 — Accounting and reporting

Account definitions and expense categories are organization-scoped. Journals, expenses, cash movements, cash-ledger rows, and daily closes are written in tenant transactions and read for the active outlet. Sales and refund journal entries use tenant-owned accounts and validate that debits and credits balance.

The new `/api/reports/organization` path is owner-only. It lists active outlets for the current organization, queries each outlet explicitly, and sums the per-outlet sales and refund totals.

The new migration replaces selected global uniqueness indexes with tenant keys: orders and queue numbers by outlet, tables and operational ledgers by outlet, daily closes by outlet/date, and accounts and expense categories by organization. The expand-phase tenant columns remain nullable until Phase 6.

## Task 15 — Membership and admin operations

Team listing only reads memberships in the active outlet. Admin operations attach an existing global identity or create one, then set the outlet role on its membership. Deactivation changes membership state without deactivating the global user. The last active organization owner cannot be removed. User APIs now rely on tenant-role authorization rather than treating the legacy global `User.role` as the authorization source.

## Verification

- `npm test`: 44 files passed, 5 skipped; 230 tests passed, 10 skipped.
- `npm run lint`: passed.
- `npx prisma validate`: passed.
- `npm run build`: passed, including Next.js TypeScript checks and static page generation.
- Fresh PostgreSQL migration deploy: all 17 migrations applied successfully, including `20261002120000_phase_4_tenant_unique`.
- PostgreSQL integration suite: 3 files passed and 1 was skipped; 6 tests passed and 2 were skipped. This includes checkout/refund isolation and ingredient stock restoration, tenant schema constraints, and catalog settings isolation. The legacy backfill integration test is skipped unless its dedicated fixture database is configured.
- Development seed ran twice against the fresh Phase 4 database successfully.
- `npm run build`: passed, including Next.js TypeScript checks and static page generation. The first attempt could not fetch Inter from Google Fonts; the network-enabled retry passed.

## Follow-up work

- Refunds currently support full-order refunds; partial refunds are not implemented.
- Global category-slug and product-SKU uniqueness remains until Phase 6. Legacy global stock/availability columns and `User.role` also remain until contract cleanup.
- Customer-display `scopeKey` remains in the schema for compatibility, but its values are tenant-specific. Phase 6 can remove the legacy field after callers are gone.
- PostgreSQL row-level security is scheduled for Phase 6; this phase uses tenant transaction context and explicit query predicates.
- The owner aggregation path summarizes sales and refunds. It does not yet provide a consolidated version of every dashboard report.
- Outlet switching and organization/outlet administration screens are scheduled for Phase 5.

## Commit sequence

- `feat: scope checkout and orders by outlet`
- `feat: scope operational displays by outlet`
- `feat: scope accounting and reports by tenant`
- `feat: add tenant-scoped membership management`
- `docs: add phase 4 review`

Phase 5 has not started. Review this document and the code before asking to continue.
