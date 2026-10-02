# Phase 6 Preflight: Contract and Row-Level Security

**Status:** Blocked before implementation. No schema contract or RLS migration has been written or applied.

**Branch:** `feature/multi-tenant-organizations-outlets`

**Starting revision:** `b941506` (`docs: add phase 5 review`)

## Why Phase 6 has not started

The plan requires a clean production-like migration rehearsal and saved invariant report before the contract migration. The repository has a local PostgreSQL URL in `.env`, but the configured PostgreSQL endpoint is not reachable. No disposable/restored snapshot is available. Docker access also fails at `/var/run/docker.sock` with `operation not permitted`, and this environment runs as an unprivileged user. Therefore there is no safe database on which to run the rehearsal or the RLS integration tests.

The existing `prisma/migrations/20261001150000_tenant_legacy_backfill` migration is not a substitute for a verified post-backfill invariant report. Phase 6 is deliberately left incomplete until a restored database is reachable and invariants pass.

## Code audit findings

The current Prisma schema still has global `User.role`, product/variant/ingredient SKU uniqueness, legacy product and ingredient stock fields, and a global customer-display `scopeKey`. Some stock names remain valid API/domain fields backed by outlet inventory rows; search matches must be classified by whether they refer to a Prisma legacy column or an outlet-scoped balance before removal.

Current schema excerpts (not the intended final schema):

```prisma
model User {
  // ...
  role UserRole
}

model Product {
  sku           String?  @unique
  stockQuantity Decimal? @map("stock_quantity") @db.Decimal(12, 3)
  isAvailable   Boolean  @default(true) @map("is_available")
}

model CustomerDisplayState {
  scopeKey String @unique @default("default") @map("scope_key")
}
```

These fields are still referenced by application, test, and/or fixture code. Removing them without a tested caller migration would break runtime behavior. The next implementation step is to restore/reach a disposable PostgreSQL snapshot, capture and verify invariants, then migrate callers and schema in the sequence in the Phase 6 plan.

## Checks completed from the current branch

- `npm test`: 48 files passed, 5 skipped; 238 tests passed, 10 skipped.
- `npm run lint`: passed.
- `npx prisma validate`: passed.
- `npm run build`: blocked because the build could not fetch Inter from `fonts.googleapis.com` under the environment's network policy.
- `prisma migrate status` and a read-only Prisma connection check: database connection unavailable.
- Docker daemon check: denied access to `/var/run/docker.sock`.

## Phase 7 dependency

Phase 7 release verification depends on the Phase 6 schema and RLS implementation, a restored production snapshot, and a reachable browser preview. It has not started. Production rollout remains outside this preflight and requires its own final go-ahead after backup, target, and verification evidence are reviewable.
