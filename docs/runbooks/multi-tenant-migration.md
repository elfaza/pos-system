# Multi-Tenant Migration Runbook

## Scope

This runbook controls the production transition from the current single-outlet schema to organization/outlet tenancy. It implements the expand, backfill, application switch, observation, contract, and RLS sequence defined in the architecture design.

Do not run this procedure until `docs/runbooks/database-restore-rehearsal.md` has passed against a recent production recovery point.

## Release Boundaries

The migration is split into two production releases.

### Compatibility release

- creates tenant foundation tables
- adds nullable tenant columns
- backfills one legacy organization and outlet
- creates memberships and outlet stock rows
- deploys tenant-aware application code
- keeps legacy role, stock, availability, and global-key compatibility columns

### Contract release

- makes required tenant columns non-null
- replaces global unique constraints with scoped constraints
- removes retired compatibility columns
- enables and forces RLS for the runtime role

Never combine these releases. The compatibility observation period must complete first.

## Roles

- **Release owner:** controls deploy/pause/rollback decisions.
- **Database operator:** performs backup, migration, verification, and restore operations.
- **Application verifier:** performs role and workflow smoke tests.
- **Incident contact:** owns customer communication if the window is exceeded.

Record a named person for each role before starting.

## Required Artifacts

- release commit SHA and Vercel deployment ID
- production Neon project/branch name without credentials
- UTC recovery-point timestamp
- encrypted `pg_dump` checksum
- successful restore-rehearsal record
- pre-migration invariant JSON
- post-backfill invariant JSON
- migration command logs with secrets removed
- smoke-test result
- go/no-go decision and operator name

## Preflight Checklist

- [ ] Compatibility release tests, lint, and build pass.
- [ ] Prisma migrations have been reviewed line by line.
- [ ] Restore rehearsal passed using a recent production snapshot.
- [ ] `DATABASE_URL` identifies the production direct endpoint.
- [ ] Vercel production environment still uses the expected runtime endpoint.
- [ ] No unrelated schema or application deployment shares the window.
- [ ] Customer traffic and background writes can be paused.
- [ ] Maintenance communication is ready.
- [ ] Database operator can use Neon restore and the independent dump.
- [ ] Rollback application artifact is available.

## Compatibility Release Procedure

### 1. Start maintenance and quiesce writes

Enable maintenance mode or otherwise prevent checkout, inventory, user, and accounting writes. Existing read-only displays must not be mistaken for proof that writes are stopped.

Record the final accepted order number and UTC timestamp.

### 2. Create the recovery point

Create a Neon branch/snapshot at the recorded time and an independent custom-format `pg_dump`, following the restore-rehearsal runbook. Do not continue until the dump can be listed successfully.

### 3. Capture the legacy baseline

```bash
npm run tenant:invariants:capture -- \
  --stage legacy \
  --output /secure/migration/production-before.json
```

Save its checksum. The file is immutable deployment evidence.

### 4. Apply expand and backfill migrations

Use the release artifact and production direct connection:

```bash
npm run prisma:deploy
```

Do not run `prisma migrate dev` in production. Stop on the first non-zero exit or unexpected migration.

### 5. Verify the backfill before application deployment

```bash
npm run tenant:invariants:capture -- \
  --stage tenant \
  --output /secure/migration/production-after-backfill.json

npm run tenant:invariants:verify -- \
  --before /secure/migration/production-before.json \
  --after /secure/migration/production-after-backfill.json
```

All row counts and financial sums must match. All tenant integrity metrics must be zero. A failed check is a stop condition, not a warning.

### 6. Deploy tenant-aware application code

Deploy the prebuilt compatibility artifact. Confirm the deployment has the intended Git SHA and database environment.

Run the session-revocation command introduced with the backfill release. All legacy sessions must be invalidated so users authenticate into a server-derived tenant context.

### 7. Smoke-test the migrated outlet

Use representative accounts for every existing role:

- admin/owner can reach dashboard and current outlet
- cashier can create, hold, resume, pay, print, and find an order
- dine-in table selection works
- kitchen receives and advances only current-outlet orders
- queue shows only current-outlet ready orders
- customer display receives only current-outlet cart/menu state
- stock deduction and refund restoration affect expected balances
- report totals match the captured baseline plus smoke-test activity
- expense, cash movement, journal, and daily close remain balanced

Use a clearly marked smoke-test order and record its cleanup/accounting treatment.

### 8. Restore traffic

The release owner restores traffic only after database and application verifiers sign off. Record the first successful post-maintenance order.

## Compatibility Observation Period

Observe at least one complete business cycle before scheduling the contract release. Track:

- authentication and tenant-context failures
- forbidden/not-found rates on tenant routes
- checkout and payment errors
- queue-number conflicts
- inventory balance anomalies
- journal imbalance or duplicate-source errors
- database latency, locks, and connection saturation
- invariant snapshots at the end of each agreed observation checkpoint

Keep the previous application artifact and pre-migration recovery artifacts available throughout this period.

## Compatibility Rollback

Before any contract migration, the schema intentionally remains compatible with the previous application.

1. Re-enable maintenance mode and stop writes.
2. Capture an incident invariant snapshot.
3. If data is structurally intact, redeploy the previous application artifact while retaining expanded columns/tables.
4. If data is corrupt or missing, restore from the tested Neon recovery point or portable dump.
5. Reconcile orders accepted after the recovery point before reopening.

Do not improvise a reverse SQL migration during an incident.

## Contract and RLS Release

Proceed only after compatibility sign-off and a new restore rehearsal against the current production state.

1. Start maintenance and quiesce writes.
2. Create a new Neon recovery point and independent dump.
3. Capture a new tenant-stage invariant snapshot.
4. Apply contract migrations with `npm run prisma:deploy`.
5. Confirm required tenant columns are non-null and scoped constraints exist.
6. Confirm the runtime database role has RLS forced and no bypass privilege.
7. Run cross-organization isolation tests with at least two organizations.
8. Capture and verify a post-contract tenant snapshot.
9. Deploy the contract-compatible application artifact.
10. Repeat the full role/workflow smoke test before restoring traffic.

After contract begins, rollback is a tested forward fix or database restore. The old application is no longer schema-compatible.

## Stop Conditions

Stop and keep maintenance enabled when:

- backup or restore evidence is missing
- migration output differs from the reviewed migration list
- any invariant changes unexpectedly
- any tenant integrity metric is non-zero
- any cross-organization access succeeds
- existing users lack a valid migrated membership
- outlet stock rows are missing
- journal debits and credits differ
- migration or verification exceeds the maintenance window
- production deployment points at an unverified database branch

The release owner decides between compatibility rollback and restore using the latest verified recovery point. Customer communication must describe confirmed impact only.

## Credential Handling

- Store URLs and tokens only in Vercel/Neon secret controls or an approved password manager.
- Do not commit `.env` files, dumps, snapshots containing sensitive row-level data, or command transcripts containing URLs.
- Use separate runtime and migration database roles before RLS activation.
- Rotate any credential exposed in terminal logs, screenshots, chat, or tickets.
- Delete temporary restore credentials when the rehearsal or migration closes.
