# Multi-Tenant Organizations and Outlets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add professional organization/outlet tenancy while preserving every existing customer's record and financial value.

**Architecture:** Keep one shared schema for standard customers, derive tenant context from authenticated sessions, scope catalog data to organizations and operational data to outlets, and add PostgreSQL RLS after all application paths are tenant-aware. Deliver the database transition through separate expand/backfill, application-switch, and contract releases.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 6, PostgreSQL/Neon, Vitest, ESLint

---

## Delivery Rules

- Do not combine expand and contract migrations.
- Do not remove a legacy column until the application no longer reads or writes it and production verification has passed.
- Every service/repository change starts with a failing tenant-isolation test.
- Never authorize using an organization or outlet ID supplied by the client.
- Commit at the end of each task or small coherent task group.
- Run `npm test`, `npm run lint`, and `npm run build` before each release checkpoint.

## Phase 0: Capture the Legacy Baseline

### Task 1: Add tenant migration fixtures and invariant tooling

**Files:**
- Create: `prisma/fixtures/legacy-tenant-baseline.ts`
- Create: `scripts/capture-tenant-invariants.ts`
- Create: `scripts/verify-tenant-invariants.ts`
- Create: `src/lib/tenant-migration-invariants.ts`
- Test: `src/lib/tenant-migration-invariants.test.ts`
- Modify: `package.json`

- [ ] Write failing tests for count comparisons, decimal financial sums, null tenant detection, outlet/organization consistency, membership coverage, and stock-row coverage.
- [ ] Implement invariant calculation with Prisma `Decimal` values; do not compare financial values through JavaScript floating point.
- [ ] Add `tenant:invariants:capture` and `tenant:invariants:verify` scripts.
- [ ] Build a deterministic legacy fixture containing all roles, all order types/statuses, payment/refund data, recipes, direct stock, ingredient stock, activity logs, and accounting entries.
- [ ] Run `npm test -- src/lib/tenant-migration-invariants.test.ts`.
- [ ] Commit: `test: add tenancy migration invariants`

### Task 2: Document the production migration runbook

**Files:**
- Create: `docs/runbooks/multi-tenant-migration.md`
- Create: `docs/runbooks/database-restore-rehearsal.md`

- [ ] Specify backup ownership, Neon branch or restored-database rehearsal, expected commands, stop conditions, maintenance communication, session revocation, smoke tests, and rollback decision points.
- [ ] Require saved pre/post invariant reports with the deployment record.
- [ ] Confirm the runbook does not contain production credentials or literal connection strings.
- [ ] Commit: `docs: add multi-tenant migration runbook`

## Phase 1: Expand the Schema Without Changing Behavior

### Task 3: Add organization, outlet, and membership models

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_tenant_foundation_expand/migration.sql`
- Test: `src/features/auth/services/tenant-membership.test.ts`

- [ ] Write failing model-level integration tests for organization slug uniqueness, outlet slug uniqueness within an organization, unique organization membership, unique outlet membership, and membership/outlet organization consistency.
- [ ] Add `Organization`, `Outlet`, `OrganizationMembership`, and `OutletMembership` models plus explicit role enums.
- [ ] Add nullable `activeOrganizationId` and `activeOutletId` to `Session`.
- [ ] Keep `User.role` unchanged in this migration.
- [ ] Add indexes for membership lookup by user and active tenant lookup by session.
- [ ] Run `npx prisma validate` and `npx prisma generate`.
- [ ] Run the focused tests.
- [ ] Commit: `feat: add organization and outlet foundation`

### Task 4: Add nullable scope columns and outlet inventory tables

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_tenant_scope_expand/migration.sql`
- Test: `src/features/inventory/services/outlet-stock.test.ts`

- [ ] Write failing tests for one outlet-product row per product/outlet and one outlet-ingredient-stock row per ingredient/outlet.
- [ ] Add nullable `organizationId` to organization-owned root models: `Category`, `Product`, `ProductVariant`, `Ingredient`, `Account`, and `ExpenseCategory`.
- [ ] Add nullable `organizationId` and `outletId` to operational root models: `AppSetting`, `CustomerDisplayState`, `Order`, `DiningTable`, `StockMovement`, `ActivityLog`, `JournalEntry`, `Expense`, `CashMovement`, `CashLedgerEntry`, and `DailyClose`.
- [ ] Add `OutletProduct` and `OutletIngredientStock` with decimal stock fields and compound unique keys.
- [ ] Keep all current global unique constraints and legacy stock/availability columns for compatibility.
- [ ] Add indexes beginning with tenant keys for the date/status lookup patterns already used by repositories.
- [ ] Run `npx prisma validate`, `npx prisma generate`, and focused tests.
- [ ] Commit: `feat: expand schema for tenant-scoped data`

### Task 5: Backfill the existing customer deterministically

**Files:**
- Create: `prisma/migrations/<timestamp>_tenant_legacy_backfill/migration.sql`
- Create: `scripts/revoke-legacy-sessions.ts`
- Test: `src/lib/tenant-backfill.integration.test.ts`

- [ ] Write a failing integration test that loads the legacy fixture, applies the backfill, and verifies all invariants.
- [ ] Insert stable legacy IDs such as `org_legacy_default` and `outlet_legacy_default` only when they do not already exist.
- [ ] Backfill tenant columns for every existing root row.
- [ ] Convert existing users: `admin` becomes organization owner plus outlet admin; every other role becomes an outlet membership with the same effective role.
- [ ] Copy product availability/direct stock and ingredient stock into outlet rows without changing legacy values.
- [ ] Populate session tenant columns for testability, but plan to revoke production sessions at cutover.
- [ ] Make the SQL idempotent enough to detect and stop on conflicting legacy IDs rather than silently attaching unrelated data.
- [ ] Run the invariant verifier against the migrated fixture.
- [ ] Commit: `feat: backfill legacy data into default tenant`

## Phase 2: Introduce Server-Derived Tenant Context

### Task 6: Add tenant-aware auth types and role resolution

**Files:**
- Modify: `src/features/auth/types.ts`
- Create: `src/features/auth/services/tenant-context-service.ts`
- Create: `src/features/auth/services/tenant-role-policy.ts`
- Test: `src/features/auth/services/tenant-context-service.test.ts`
- Test: `src/features/auth/services/tenant-role-policy.test.ts`

- [ ] Write failing tests for sole-outlet selection, owner access to all organization outlets, direct outlet membership, inactive membership, inactive organization/outlet, and no-access behavior.
- [ ] Add `TenantContext`, membership DTOs, and effective-role types.
- [ ] Implement deterministic effective-role resolution and allowed-route policy.
- [ ] Keep the existing `User` response compatible while callers migrate.
- [ ] Run focused auth tests.
- [ ] Commit: `feat: add tenant context role resolution`

### Task 7: Make login and session lookup tenant-aware

**Files:**
- Modify: `src/features/auth/services/auth-service.ts`
- Modify: `src/features/auth/services/session-service.ts`
- Modify: `src/features/auth/services/auth-service.test.ts`
- Modify: `src/features/auth/services/session-service.test.ts`
- Create: `src/app/api/session/outlet/route.ts`
- Test: `src/app/api/session/outlet/route.test.ts`

- [ ] Write failing tests proving login selects only a valid membership and outlet switching rejects an outlet in another organization.
- [ ] Store active organization/outlet on session creation.
- [ ] Return tenant context from session lookup without trusting cookies beyond the opaque session token.
- [ ] Add `getCurrentTenantContext()` and `requireTenantContext(allowedRoles)`.
- [ ] Add an outlet-switch endpoint that updates the session only after authorization and records an activity event.
- [ ] Return the same not-found/forbidden shape for inaccessible foreign-tenant outlets.
- [ ] Run focused auth and route tests.
- [ ] Commit: `feat: bind sessions to organization and outlet`

### Task 8: Add tenant transaction infrastructure

**Files:**
- Create: `src/lib/tenant-prisma.ts`
- Create: `src/lib/tenant-prisma.test.ts`
- Modify: `src/lib/prisma.ts`

- [ ] Write failing tests showing tenant values are transaction-local, cleared after commit/rollback, and never reused by a later transaction.
- [ ] Implement `withTenantTransaction(context, callback)` using an interactive Prisma transaction and parameterized PostgreSQL `set_config(..., true)` calls.
- [ ] Expose only `Prisma.TransactionClient` to tenant repository callbacks.
- [ ] Keep non-request migration/provisioning Prisma access explicit and separate.
- [ ] Run the test against PostgreSQL, not an in-memory substitute.
- [ ] Commit: `feat: add tenant-scoped database transactions`

## Phase 3: Scope Organization-Owned Features

### Task 9: Scope categories, products, options, and settings

**Files:**
- Modify: `src/features/catalog/repositories/category-repository.ts`
- Modify: `src/features/catalog/repositories/product-repository.ts`
- Modify: `src/features/catalog/repositories/settings-repository.ts`
- Modify: `src/features/catalog/services/category-service.ts`
- Modify: `src/features/catalog/services/product-service.ts`
- Modify: `src/features/catalog/services/settings-service.ts`
- Modify: `src/app/api/categories/route.ts`
- Modify: `src/app/api/categories/[id]/route.ts`
- Modify: `src/app/api/products/route.ts`
- Modify: `src/app/api/products/[id]/route.ts`
- Modify: `src/app/api/settings/route.ts`
- Test: `src/features/catalog/services/catalog-tenancy.test.ts`

- [ ] Write failing tests proving two organizations may use the same slug/SKU and cannot access each other's records by guessed ID.
- [ ] Pass tenant context through routes, services, and repositories.
- [ ] Scope every list, read, create, update, and delete predicate in the database query itself.
- [ ] Keep catalog definitions organization-scoped and settings outlet-scoped.
- [ ] Validate that category, product, variant, option, and ingredient references share the current organization.
- [ ] Run all catalog tests.
- [ ] Commit: `feat: scope catalog and settings by tenant`

### Task 10: Switch inventory to outlet balances

**Files:**
- Modify: `src/features/inventory/repositories/inventory-repository.ts`
- Modify: `src/features/inventory/services/inventory-service.ts`
- Modify: `src/app/api/ingredients/route.ts`
- Modify: `src/app/api/ingredients/[id]/route.ts`
- Modify: `src/app/api/ingredients/[id]/adjustments/route.ts`
- Modify: `src/app/api/stock-movements/route.ts`
- Modify: `src/features/inventory/services/inventory-service.test.ts`
- Create: `src/features/inventory/services/inventory-tenancy.test.ts`

- [ ] Write failing tests for per-outlet balances, same ingredient in two outlets, and cross-tenant adjustment rejection.
- [ ] Read and mutate `OutletIngredientStock` and `OutletProduct` inside tenant transactions.
- [ ] Scope stock movements to the active outlet and organization.
- [ ] Ensure checkout deductions and refund restoration can update only stock rows for the order's outlet.
- [ ] Keep temporary dual-write compatibility only if rollback testing requires it; document and test the exact removal checkpoint.
- [ ] Run all inventory tests.
- [ ] Commit: `feat: move inventory balances to outlets`

### Task 11: Update seed and provisioning workflows

**Files:**
- Modify: `prisma/seed.ts`
- Create: `scripts/provision-organization.ts`
- Create: `src/features/organizations/services/provision-organization.ts`
- Test: `src/features/organizations/services/provision-organization.test.ts`
- Modify: `package.json`

- [ ] Write failing tests for atomic organization, first outlet, owner, memberships, settings, and chart-of-accounts creation.
- [ ] Make seed data explicitly belong to a development organization and outlet.
- [ ] Add a non-interactive provisioning script with validated arguments and no default production password.
- [ ] Roll back the whole transaction on duplicate slug/email conflicts or partial failure.
- [ ] Add `organization:provision` to `package.json`.
- [ ] Run seed/provisioning tests on an empty database and a database with one existing organization.
- [ ] Commit: `feat: add organization provisioning workflow`

## Phase 4: Scope Operational and Financial Features

### Task 12: Scope checkout, orders, tables, and receipts

**Files:**
- Modify: `src/features/checkout/repositories/order-repository.ts`
- Modify: `src/features/checkout/services/checkout-service.ts`
- Modify: checkout/order API routes under `src/app/api/orders/`
- Modify: `src/app/api/tables/route.ts`
- Modify: `src/features/checkout/services/checkout-service.test.ts`
- Create: `src/features/checkout/services/checkout-tenancy.test.ts`

- [ ] Write failing tests for outlet-scoped order/queue numbers, table lookup, product lookup, held-order access, payment, cancellation, and refund.
- [ ] Generate order and queue numbers under an outlet-specific unique constraint and transaction.
- [ ] Reject products, variants, options, tables, payments, or orders outside the active tenant without revealing existence.
- [ ] Stamp new orders with organization/outlet IDs and preserve those IDs through payments, refunds, kitchen, and receipts.
- [ ] Ensure receipt rendering itself remains unchanged except for reading the correct outlet settings.
- [ ] Run all checkout tests.
- [ ] Commit: `feat: scope checkout and orders by outlet`

### Task 13: Scope kitchen, queue, and customer display

**Files:**
- Modify: `src/features/kitchen/repositories/kitchen-repository.ts`
- Modify: `src/features/kitchen/services/kitchen-service.ts`
- Modify: kitchen API routes under `src/app/api/kitchen/`
- Modify: customer display repository/service and routes under `src/features/customer-display/` and `src/app/api/customer-display/`
- Modify: queue routes under `src/app/api/queue/`
- Create: `src/features/kitchen/services/kitchen-tenancy.test.ts`
- Create: `src/features/customer-display/services/customer-display-tenancy.test.ts`

- [ ] Write failing tests proving displays only receive their outlet's orders, menu availability, and display state.
- [ ] Replace the global customer-display `scopeKey` behavior with one state row per outlet.
- [ ] Keep kitchen transitions and queue completion constrained to the order's outlet.
- [ ] Verify display-device users cannot switch to outlets without explicit membership.
- [ ] Run all kitchen, queue, and customer-display tests.
- [ ] Commit: `feat: scope operational displays by outlet`

### Task 14: Scope accounting and reporting

**Files:**
- Modify: `src/features/accounting/services/accounting-service.ts`
- Modify: accounting API routes under `src/app/api/accounting/`
- Modify: `src/features/reporting/repositories/reporting-repository.ts`
- Modify: `src/features/reporting/services/reporting-service.ts`
- Modify: reporting API routes under `src/app/api/reports/`
- Create: `src/features/accounting/services/accounting-tenancy.test.ts`
- Create: `src/features/reporting/services/reporting-tenancy.test.ts`

- [ ] Write failing tests for organization-scoped account definitions and outlet-scoped journals, expenses, cash movements, ledger entries, and daily closes.
- [ ] Scope source uniqueness and daily-close uniqueness by outlet.
- [ ] Require balanced journal entries within one organization and outlet context.
- [ ] Make existing reports active-outlet only first.
- [ ] Add explicit owner-only organization aggregation as a separate query path; never implement it by omitting tenant predicates.
- [ ] Verify consolidated totals equal the sum of authorized outlet totals.
- [ ] Run all accounting and reporting tests.
- [ ] Commit: `feat: scope accounting and reports by tenant`

### Task 15: Scope users, activity logs, and admin operations

**Files:**
- Modify: `src/features/auth/repositories/user-repository.ts`
- Modify: `src/features/auth/services/user-service.ts`
- Modify: routes under `src/app/api/users/`
- Create: `src/features/organizations/services/membership-service.ts`
- Test: `src/features/organizations/services/membership-service.test.ts`

- [ ] Write failing tests for inviting an existing global user, creating a new user, assigning outlet roles, deactivating membership without deactivating identity, and preventing last-owner removal.
- [ ] Replace global role edits with organization/outlet membership operations.
- [ ] Stamp activity logs with organization/outlet context and scope log reads.
- [ ] Prevent one organization administrator from discovering users only through another organization's membership.
- [ ] Run auth, membership, and admin route tests.
- [ ] Commit: `feat: add tenant-scoped membership management`

## Phase 5: Add the Tenant User Experience

### Task 16: Add outlet selection and switching to the existing shell

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/features/admin/components/admin-shell.tsx`
- Modify: `src/features/auth/context/auth-context.tsx`
- Create: `src/features/organizations/components/outlet-switcher.tsx`
- Create: `src/features/organizations/hooks/use-outlet-switch.ts`
- Test: `src/features/organizations/components/outlet-switcher.test.tsx`

- [ ] Write failing component tests for hidden single-outlet state, authorized options, loading/error states, and successful switch.
- [ ] Add a compact outlet switcher using the current visual system.
- [ ] On switch, clear React Query caches, reset POS/cart state, and navigate to the role's valid landing page.
- [ ] Do not expose organization/outlet IDs as authorization-bearing client state.
- [ ] Run component and auth tests.
- [ ] Commit: `feat: add outlet switching experience`

### Task 17: Add organization, outlet, and membership admin pages

**Files:**
- Create: `src/app/dashboard/organization/page.tsx`
- Create: `src/app/dashboard/outlets/page.tsx`
- Create: `src/app/dashboard/team/page.tsx`
- Create supporting components under `src/features/organizations/components/`
- Create routes under `src/app/api/organizations/` and `src/app/api/outlets/`
- Test corresponding service and route files

- [ ] Write failing authorization tests before each management endpoint.
- [ ] Add organization profile, outlet management, and team membership views using existing dashboard patterns.
- [ ] Enforce owner/admin capability differences on the server and mirror them in UI visibility.
- [ ] Include empty, loading, validation, conflict, and inactive states.
- [ ] Run feature tests and perform desktop/mobile browser verification.
- [ ] Commit: `feat: add organization and outlet administration`

## Phase 6: Contract the Schema and Add Database Enforcement

### Task 18: Replace legacy constraints and columns

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_tenant_contract/migration.sql`
- Modify: `prisma/seed.ts`
- Modify affected tests and fixtures

- [ ] Re-run the production-like migration rehearsal and save a clean invariant report before writing the contract migration.
- [ ] Add `NOT NULL` to required tenant columns.
- [ ] Replace global uniqueness with the scoped constraints listed in the design.
- [ ] Remove `User.role`, global stock/availability columns, and the global customer-display scope key only after repository searches prove they have no callers.
- [ ] Add composite foreign-key safeguards where they improve organization/outlet consistency.
- [ ] Run `rg 'User\.role|stockQuantity|currentStock|scopeKey' src prisma` and classify every remaining match.
- [ ] Run Prisma validation, generation, full tests, lint, and build.
- [ ] Commit: `refactor: contract schema around tenant ownership`

### Task 19: Enable PostgreSQL row-level security

**Files:**
- Create: `prisma/migrations/<timestamp>_tenant_rls/migration.sql`
- Create: `src/lib/tenant-rls.integration.test.ts`
- Modify: `docs/runbooks/multi-tenant-migration.md`

- [ ] Write failing real-PostgreSQL tests for read, insert, update, delete, guessed foreign ID, unset context, transaction rollback, and pooled-connection reuse.
- [ ] Add RLS policies for organization- and outlet-scoped root tables using transaction-local settings.
- [ ] Force RLS for the runtime role and keep migration privileges on a separate role.
- [ ] Deny access when tenant settings are absent.
- [ ] Document emergency access and audit requirements without embedding credentials.
- [ ] Run the RLS test suite repeatedly with concurrent organizations.
- [ ] Commit: `feat: enforce tenant isolation with postgres rls`

## Phase 7: Release Verification

### Task 20: Run complete automated and browser verification

**Files:**
- Create: `tests/e2e/multi-tenant-smoke.spec.ts` if the repository adopts Playwright in this phase
- Modify: `docs/runbooks/multi-tenant-migration.md`

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `npx prisma validate`.
- [ ] Run migration and invariant verification against a restored production snapshot.
- [ ] Verify Organization A cannot access Organization B through every public API family.
- [ ] Browser-test login, outlet switch, POS checkout, receipt, kitchen, queue, customer display, inventory, reporting, expense, and daily close.
- [ ] Verify single-outlet users experience no unnecessary selection step.
- [ ] Record results and unresolved operational risks in the runbook.
- [ ] Commit: `test: verify multi-tenant workflows end to end`

### Task 21: Execute staged production rollout

**Files:**
- Operational change only; follow `docs/runbooks/multi-tenant-migration.md`

- [ ] Create and verify the production backup.
- [ ] Apply expand/backfill during the maintenance window.
- [ ] Run invariant verification and stop on any mismatch.
- [ ] Deploy tenant-aware application code and revoke legacy sessions.
- [ ] Smoke-test the migrated default outlet with existing users and representative orders.
- [ ] Observe errors, authorization denials, database latency, and financial invariants through the agreed monitoring window.
- [ ] Schedule the contract/RLS release only after the compatibility release is stable.
- [ ] Apply contract/RLS, rerun invariants and smoke tests, and retain the backup through the final observation period.

## Acceptance Criteria

- Existing customer row counts and financial sums match the captured baseline.
- Existing users can sign in again and reach the migrated default outlet with equivalent permissions.
- Two organizations can use identical business-level identifiers without conflict.
- No API, service, repository, display, report, or accounting path exposes another tenant's data.
- Products and ingredients have independent stock per outlet.
- Order, queue, table, settings, customer display, accounting, and daily-close behavior is outlet-scoped.
- Organization owners can manage outlets and memberships and view explicitly authorized consolidated reports.
- Runtime database access is denied when tenant context is missing and protected by PostgreSQL RLS.
- Full tests, lint, build, migration rehearsal, invariant checks, and browser smoke tests pass.
