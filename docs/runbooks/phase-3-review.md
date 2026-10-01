# Phase 3 Review: Organization-Owned Features

**Branch:** `feature/multi-tenant-organizations-outlets`  
**Scope:** Plan Tasks 9–11  
**Status:** Complete; waiting for review before Phase 4.

## What changed

### Task 9 — Catalog and settings

Categories and products are now read and mutated with an organization predicate. Category references, ingredients, variants, options, and recipes are validated against the active organization. Product availability, stock, and ingredient quantities are read from the selected outlet's balance rows. Settings are unique to the current organization and outlet; concurrent first reads serialize before creating defaults. Catalog and settings routes obtain the trusted tenant context before calling services.

Customer-display menu reads now pass tenant context through catalog and settings services. Display state itself remains global and is scheduled for Task 13.

Representative product query:

```ts
return client.product.findMany({
  where: {
    organizationId,
    ...(!filters.includeUnavailable
      ? { outletProducts: { some: { outletId, isAvailable: true } } }
      : {}),
  },
  include: productInclude(outletId),
  take: productListLimit,
});
```

### Task 10 — Inventory

Ingredient identity is organization-scoped; balances and low-stock thresholds are outlet-scoped in `OutletIngredientStock`. Adjustments conditionally update only the selected outlet's balance and create scoped movement and activity records within the tenant transaction. Product stock and availability writes likewise use `OutletProduct` rows.

Representative guarded adjustment:

```ts
const result = await tx.outletIngredientStock.updateMany({
  where: {
    outletId: context.outletId,
    ingredientId,
    ...(direction === "decrease" ? { currentStock: { gte: quantity } } : {}),
  },
  data: { currentStock: { [direction === "increase" ? "increment" : "decrement"]: quantity } },
});
```

Checkout deductions and refund restoration are deliberately sequenced with Task 12, when checkout will use the persisted order outlet. The existing checkout path still uses legacy stock columns until that cutover; no refund restoration caller was present to move in this phase.

### Task 11 — Seed and provisioning

The development seed now explicitly provisions a development organization and outlet, assigns membership roles, and attaches catalog balances, settings, and finance records to that tenant. It remains repeatable. A new non-interactive provisioning command validates organization/outlet/owner inputs, requires `PROVISION_OWNER_PASSWORD`, and creates the organization, first outlet, owner memberships, settings, starter accounts, expense categories, and optional sample catalog atomically.

Representative provisioning invocation:

```sh
PROVISION_OWNER_PASSWORD='...' npm run organization:provision -- \
  --organization-name 'Example Org' --organization-slug example-org \
  --outlet-name 'Main Outlet' --outlet-slug main \
  --owner-name 'Owner Name' --owner-email owner@example.com
```

The password is required from the environment and is not printed by the script.

## Verification

- `npm test`: 38 files passed, 4 skipped; 216 tests passed, 9 skipped.
- `npm run lint`: passed.
- `npm run build`: passed, including Next.js TypeScript checks and static page generation.
- PostgreSQL 18 integration suite against a fresh migrated disposable database: 4 files passed, 8 tests passed. It covered outlet settings isolation and concurrent initialization, outlet inventory isolation and cross-organization rejection, atomic provisioning/rollback, and tenant transaction context.
- The development seed was previously run twice against PostgreSQL successfully to confirm idempotency.

The standalone `npx tsc --noEmit` command still reports existing diagnostics in checkout, kitchen-printer, and reporting tests. The Next.js production build's TypeScript stage passes. One Phase 3 list-limits fixture was updated to match the new tenant-aware repository signatures.

## Known follow-up work

- Global category-slug and product-SKU uniqueness constraints remain until Task 18 replaces legacy global constraints. Tenant predicates are in place, but duplicate values across organizations are not yet accepted by PostgreSQL.
- Checkout still reads and writes legacy stock columns. Task 12 will move deductions to persisted order outlet balances and implement/verify refund restoration as part of checkout tenancy.
- Customer-display state remains globally scoped until Task 13.
- The tenant/outlet selection experience and behavior for users with multiple outlets is scheduled for Task 16.

## Commit sequence

The code is organized into the plan's three task-sized commits, followed by this review-document commit:

- `feat: scope catalog and settings by tenant`
- `feat: move inventory balances to outlets`
- `feat: add organization provisioning workflow`
- `docs: add phase 3 review`

Phase 4 is not started. Review this document and the code before asking to continue.
