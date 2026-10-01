# Phase 0 Review

Date: 2026-10-01

Branch: `feature/multi-tenant-organizations-outlets`

## Delivered

- Exact decimal comparison of financial sums and comparison of all existing table counts.
- JSON report validation rejects empty/incomplete reports, unsupported versions, invalid counts, and non-finite decimals.
- Tenant-stage verification requires zero null scope keys, broken outlet/organization pairs, uncovered memberships, and missing outlet-stock rows.
- Capture queries run in a read-only repeatable-read transaction.
- Output files are created exclusively so an existing baseline cannot be silently overwritten.
- Legacy fixture covers all five user roles, all six order statuses, all three order types, recipes/options, product and ingredient stock, payments/refunds, activity logs, and balanced accounting entries.
- Fixture rejects a populated database before writing and normalizes timestamps for repeatability.
- Backup restoration and production migration runbooks specify recovery artifacts, operators, maintenance windows, stop conditions, and rollback decisions.

## Verification

- `npm test`: 30 files, 175 tests passed.
- `npm run lint`: passed.
- `npm run build`: passed, including Next.js application TypeScript checking.
- Existing 13 migrations applied successfully to two disposable PostgreSQL 18.3 databases.
- Fixture loaded successfully; fixed timestamps and rejection of a second load were verified against PostgreSQL.
- Legacy capture returned metrics for all 29 existing models.
- CLI verification accepted matching reports and rejected a one-cent payment mismatch with a non-zero exit status.
- Fixture totals: orders `200000.00`, payments `120000.00`, refunds `30000.00`, expenses `12500.00`, cash movements `500000.00`, journal debits and credits `567500.00` each.

## Limits

- Tenant-stage SQL references the planned tables and columns. It is preparatory code until Phase 1 exists and must be integration-tested against that schema before use in any migration.
- No production database was accessed, backed up, or migrated. No Neon restore rehearsal has been performed yet.
- A standalone `npx tsc --noEmit` check reports typing errors in existing checkout, cart, receipt/printer, and reporting test fixtures. The Next.js build and Vitest suite pass. These diagnostics are outside the Phase 0 files.
- Count and aggregate-sum checks detect missing rows and changed totals, but are not a row-by-row proof of data preservation. Phase 1 migration tests must also assert legacy IDs, relationships, memberships, and stock values.
- Later cutover activity creates sessions and activity logs. Compare a quiesced pre/post backfill snapshot before session revocation or smoke-test activity; capture a new baseline for subsequent release stages.

## Review Focus

Review the invariant contract, fixture coverage, and runbook stop/rollback rules. Phase 1 starts only after this checkpoint is accepted.
