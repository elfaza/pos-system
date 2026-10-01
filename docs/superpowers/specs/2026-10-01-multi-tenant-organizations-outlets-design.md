# Multi-Tenant Organizations and Outlets Design

**Status:** Approved for implementation planning
**Date:** 2026-10-01

## Context

The application currently assumes one business and one outlet. Users have one global role, catalog identifiers are globally unique, inventory balances are stored directly on products and ingredients, and operational data has no tenant key.

The product needs to support multiple independent customers professionally while preserving the existing customer's data. A customer may also operate multiple outlets and eventually need consolidated reporting.

## Decision

Use a shared PostgreSQL database and shared schema for standard customers.

- `Organization` is the customer, security, ownership, and future billing boundary.
- `Outlet` is the branch and day-to-day operational boundary.
- `User` remains a global identity identified by email.
- Organization and outlet memberships carry authorization. The global `User.role` is retired after migration.
- Every tenant-owned query receives a server-derived tenant context. Organization or outlet IDs supplied by a browser are never trusted as authorization.
- PostgreSQL row-level security is added as defense in depth after application queries have been migrated to tenant-aware transactions.
- Enterprise customers may later receive a dedicated deployment and database using the same schema and code. This is an operational tier, not a second application architecture.

## Goals

- Prevent one organization from reading or changing another organization's data.
- Allow one organization to manage multiple outlets.
- Preserve all current users, products, orders, payments, stock, and accounting records.
- Keep catalog management organization-wide while allowing outlet-specific availability and stock.
- Support outlet switching without weakening authorization.
- Make future consolidated reporting and per-outlet billing possible.
- Permit an enterprise database-isolation tier without maintaining a separate codebase.

## Non-Goals

- Public self-service signup and automated subscription billing.
- Cross-organization product sharing.
- A platform super-admin interface in the first release.
- Moving existing customers between shared and dedicated databases automatically.
- Reworking receipt, kitchen, or accounting business rules beyond tenant scoping.

## Domain Model

### Organization

An organization owns users' memberships, catalog definitions, recipes, accounts, and expense categories.

Core fields:

- `id`
- `name`
- `slug`
- `isActive`
- `createdAt`
- `updatedAt`

`slug` is globally unique because it is an administrative identifier. It is not accepted as proof of access.

### Outlet

An outlet belongs to exactly one organization and owns operational activity.

Core fields:

- `id`
- `organizationId`
- `name`
- `slug`
- `timeZone`, defaulting to `Asia/Jakarta` for the migrated outlet
- `isActive`
- `createdAt`
- `updatedAt`

The unique key is `(organizationId, slug)`.

### Identity and Membership

`User` remains globally unique by normalized email. Authorization moves to two explicit models:

- `OrganizationMembership`: organization-level access with `owner` or `admin` role.
- `OutletMembership`: outlet-level access with `admin`, `cashier`, `kitchen`, `queue`, or `customer_facing_display` role.

An organization owner can access all outlets in that organization. Organization administrators receive only the organization management capabilities explicitly granted by the role policy. Operational roles are outlet-specific.

An existing `admin` user is migrated to organization `owner` and default-outlet `admin`. Other existing roles become memberships on the default outlet. After the contract migration, `User.role` is removed.

### Session Context

`Session` stores the selected `activeOrganizationId` and `activeOutletId`. Login behavior is:

1. Load active memberships for the authenticated user.
2. If exactly one usable outlet exists, select it automatically.
3. If multiple outlets exist, use the most recently selected valid outlet or require a selection.
4. Derive the effective role on the server.

The server exposes a `TenantContext` value containing:

```ts
interface TenantContext {
  userId: string;
  organizationId: string;
  outletId: string;
  role: EffectiveRole;
}
```

Route handlers use `requireTenantContext(allowedRoles)` instead of `requireUser(allowedRoles)`. Switching outlets validates membership before updating the session. Existing sessions are revoked during the production migration so no session can retain a role with ambiguous tenant scope.

## Data Ownership

### Organization-scoped data

- Category
- Product and variants
- Product option groups and values
- Ingredient definitions
- Recipes and ingredient replacement rules
- Account
- Expense category

Organization-scoped unique keys replace global unique keys, including category slug, product SKU, variant SKU, ingredient SKU, account code, and expense-category name.

### Outlet-scoped data

- App settings and enabled modules
- Customer display state
- Dining tables
- Orders and queue numbers
- Payments and refunds through their order
- Stock balances and stock movements
- Journal entries and cash ledger entries
- Expenses and cash movements
- Daily closes
- Operational activity logs

Operational root records carry both `organizationId` and `outletId`. Keeping both keys makes authorization predicates and audit queries explicit and supports defense-in-depth checks that the outlet belongs to the organization. Child records such as order items and journal-entry lines inherit scope through a required parent relation.

### Outlet Catalog and Inventory

Catalog definitions remain organization-wide. Outlet behavior is represented separately:

- `OutletProduct` stores availability, an optional price override, direct stock quantity, and low-stock threshold for one product at one outlet.
- `OutletIngredientStock` stores current stock and low-stock threshold for one ingredient at one outlet.

The existing `Product.isAvailable`, `Product.stockQuantity`, `Product.lowStockThreshold`, `Ingredient.currentStock`, and `Ingredient.lowStockThreshold` columns remain temporarily during migration. Their values are copied to default-outlet rows before application reads move to the new tables. They are removed only in a later contract migration.

## Scoped Constraints

Important unique constraints become:

- Category: `(organizationId, slug)`
- Product: `(organizationId, sku)` when SKU is non-null
- Product variant: `(organizationId, sku)` when SKU is non-null
- Ingredient: `(organizationId, sku)`
- Outlet product: `(outletId, productId)`
- Outlet ingredient stock: `(outletId, ingredientId)`
- Dining table: `(outletId, name)`
- Order number: `(outletId, orderNumber)`
- Queue number: `(outletId, queueBusinessDate, queueNumber)`
- App setting: one row per outlet
- Customer display state: one row per outlet
- Account: `(organizationId, code)`
- Expense category: `(organizationId, name)`
- Journal entry number: `(outletId, entryNumber)`
- Journal source: `(outletId, sourceType, sourceId)`
- Cash ledger source: `(outletId, sourceType, sourceId)`
- Daily close: `(outletId, businessDate)`

Tenant foreign keys are validated in services before writes. Where PostgreSQL can enforce a composite relationship without excessive duplication, migrations add matching composite constraints as an additional guard.

## Query and Service Boundaries

Tenant context is required at the service and repository boundary:

```ts
await listProducts(context, filters);
await finalizeCheckout(context, payload);
await getDailySummary(context, businessDate);
```

Repositories must include organization/outlet predicates in the same query that fetches or mutates a record. Fetching by bare record ID and checking ownership afterward is prohibited because it is easy to omit and can create time-of-check/time-of-use gaps.

Shared helpers may construct predicates, but there is no unrestricted generic tenant repository. Explicit feature repositories keep domain queries readable and testable.

## Row-Level Security

Application scoping is the first enforcement layer. PostgreSQL RLS is the second.

Tenant database work runs in an interactive transaction that calls PostgreSQL `set_config` with transaction-local values for `app.organization_id` and `app.outlet_id`. Policies compare table tenant columns to those settings. Transaction-local settings are required because pooled Neon connections must never retain tenant identity between requests.

RLS is enabled only after every production query path uses the tenant-aware transaction helper. Migration and administrative roles use a separately controlled database role and are not exposed to request handling.

## Migration Strategy

Use an expand, backfill, switch, verify, and contract sequence.

### Expand

- Create organization, outlet, membership, outlet-product, and outlet-ingredient-stock tables.
- Add nullable tenant columns to existing root tables.
- Keep all legacy columns and constraints temporarily.

### Backfill

- Insert one deterministic legacy organization and one deterministic default outlet.
- Attach every existing record to that organization/outlet.
- Convert current user roles into memberships.
- Copy existing product and ingredient availability/stock into outlet rows.
- Preserve primary keys, timestamps, order numbers, queue numbers, totals, payments, journals, and daily closes.

### Verify

A migration verification command compares pre-migration and post-migration invariants:

- row counts by table
- sums of order totals, payments, refunds, expenses, cash movements, journal debits, and journal credits
- zero null tenant keys on records that must be scoped
- every operational outlet belongs to the stored organization
- every existing user has a valid membership mapping
- one outlet-stock row exists for each migrated product/ingredient that requires it

The production run requires a database backup and a restore rehearsal on a temporary database before any contract migration.

### Switch

- Deploy tenant-aware application code while compatibility columns still exist.
- Revoke existing sessions and require login.
- Monitor tenant-context failures and financial invariants.

### Contract

After a stable observation period:

- make tenant columns non-null
- replace global unique constraints with scoped constraints
- remove `User.role`
- remove legacy global stock and availability columns
- enable RLS policies

Contract work is a separate deployment and has its own rollback decision point.

## User Experience

- Single-outlet users continue directly to their allowed start page after login.
- Multi-outlet users see an outlet switcher in the existing application shell.
- Switching outlets clears client caches and cart/display state before navigation.
- Organization owners can manage outlets and memberships from the admin area.
- Reports default to the active outlet. Organization owners can select all outlets only on reports that explicitly support aggregation.
- POS, kitchen, queue, and customer display remain bound to one active outlet at a time.

## Provisioning

The first release uses a tested CLI script for organization provisioning. It creates the organization, first outlet, owner membership, outlet membership, settings, chart of accounts, and optional seed catalog in one transaction. Public signup and billing are deferred.

## Security Rules

- Tenant identity always comes from the authenticated session.
- Every mutation validates that referenced records belong to the same organization and outlet as appropriate.
- Error responses do not reveal whether another tenant's record exists.
- Activity logs include organization and outlet where the event occurred.
- Inactive organizations, outlets, users, or memberships cannot create a session context.
- Display-device accounts remain ordinary users with narrowly scoped outlet membership.

## Testing Strategy

- Unit tests for role resolution, outlet selection, and scoped identifiers.
- Repository integration tests proving Organization A cannot read, update, or delete Organization B records, including guessed IDs.
- Service tests for cross-tenant product, table, payment, refund, stock, and accounting references.
- Migration tests against a populated legacy fixture database.
- Real PostgreSQL tests for RLS transaction settings and connection-pool isolation.
- End-to-end smoke tests for login, outlet switching, checkout, kitchen, customer display, reporting, and daily close.

## Rollout and Recovery

1. Take a production backup and verify restoration to a temporary database.
2. Run expand/backfill and verification on the restored copy.
3. Record expected run time and resolve every invariant mismatch.
4. Schedule a short maintenance window for production backfill.
5. Deploy expand migration, run backfill, run verification, and deploy compatible application code.
6. Revoke sessions and smoke-test the migrated outlet.
7. Observe logs and financial invariants before the contract release.
8. Retain the pre-migration backup until the contract release has passed its observation period.

Before the contract release, rollback means deploying the previous application against the still-compatible schema. After contract begins, recovery uses a tested forward fix or database restore, never an improvised reverse migration.

## Consequences

### Benefits

- Lowest operating cost for standard customers.
- Strong application-level isolation with database-level defense in depth.
- Multi-outlet operations and consolidated reporting have clear ownership boundaries.
- Dedicated enterprise databases remain possible without forking the product.

### Costs

- Every tenant-owned query must carry context.
- Inventory requires normalization into outlet balances.
- Migrations and tests become more demanding.
- Cross-outlet reports need deliberate aggregation rather than ordinary unscoped queries.

These costs are justified because tenant isolation is a product integrity requirement, not merely a filtering feature.
