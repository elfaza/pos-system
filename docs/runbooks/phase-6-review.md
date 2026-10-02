# Phase 6 Review: Tenant Schema Contract and PostgreSQL RLS

**Status:** Implemented and exercised on disposable PostgreSQL 18.3.

**Branch:** `feature/multi-tenant-organizations-outlets`

**Scope:** Contract the nullable compatibility schema, preserve outlet inventory as the source of stock, and enforce tenant isolation in PostgreSQL for the restricted runtime role.

## Changes

- Made organization and outlet ownership required on their respective root tables.
- Removed global `User.role`, global product and ingredient stock fields, and the customer-display global key.
- Scoped category slugs and catalog identifiers to their organization.
- Added composite foreign keys and stock consistency guards for cross-organization joins.
- Added a `pos_runtime` non-login, non-superuser, non-bypass RLS role. Runtime configuration must use a login that is a member of this role; migrations use `MIGRATION_DATABASE_URL` separately.
- Kept global identity and session lookup outside RLS because login happens before tenant selection. Auth code resolves memberships in a user-scoped transaction.
- Changed Vercel build to generate Prisma Client and build the app; it no longer runs schema migrations during application build.

Main code: [tenant-prisma.ts](../../src/lib/tenant-prisma.ts), [schema.prisma](../../prisma/schema.prisma), [tenant contract migration](../../prisma/migrations/20261002130000_tenant_contract/migration.sql), and [RLS migration](../../prisma/migrations/20261002140000_tenant_rls/migration.sql).

## Code added

Tenant context is installed with parameterized values and transaction-local settings, so it is cleared after commit or rollback:

```ts
await transaction.$queryRaw`
  SELECT
    set_config('app.user_id', ${context.userId ?? ""}, true),
    set_config('app.organization_id', ${context.organizationId ?? ""}, true),
    set_config('app.outlet_id', ${context.outletId ?? ""}, true),
    set_config('app.organization_wide', ${context.role === "owner" ? "true" : "false"}, true)
`;
```

The shared row predicate denies access when required tenant settings are absent and allows owners to read across their organization while outlet roles remain outlet-scoped:

```sql
CREATE OR REPLACE FUNCTION tenant_scope_matches(row_organization_id text, row_outlet_id text)
RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT row_organization_id = NULLIF(current_setting('app.organization_id', true), '')
       AND (row_outlet_id = NULLIF(current_setting('app.outlet_id', true), '')
            OR current_setting('app.organization_wide', true) = 'true')
$$;
```

The migration forces row security on tenant tables and adds `USING` and `WITH CHECK` predicates. It also applies relation-based policies to order items, payments, refunds, journal lines, and selected option rows.

## Verification evidence

- The migration rehearsal loaded the deterministic pre-tenant fixture into PostgreSQL, applied all 19 migrations, and verified row counts and financial invariants after backfill and after contract/RLS. Reports: [before](phase-6-invariants-before.json), [after backfill](phase-6-invariants-after.json), and [after contract/RLS](phase-6-invariants-after-contract.json).
- The backfill integration test passed: 5 tests.
- PostgreSQL RLS integration tests passed: 5 tests against `pos_runtime`, including guessed foreign IDs, CRUD isolation, missing context, rollback, connection reuse, and concurrent organization transactions.
- Schema-constraint integration checks cover duplicate organization identifiers, identical organization-scoped category/product/variant/ingredient identifiers, and invalid outlet ownership.
- The dedicated disposable database reports all 19 migrations applied and Prisma reports the schema valid.

The rehearsal uses a deterministic synthetic legacy fixture. No restored production snapshot or production credentials were available, so this is not evidence of production data compatibility.

## Deployment boundary

Phase 6 is locally reviewable. Do not point runtime traffic at a database role that owns the tables or bypasses RLS. The deployment runbook still requires an actual production restore rehearsal, separate runtime/migration credentials, a verified backup, a maintenance window, and an explicit release decision before production migration.
