# Database Restore Rehearsal

## Purpose

Prove that the production database can be restored before a tenant migration is attempted. A backup is not considered usable until a separate database has been restored and verified from it.

This runbook is written for Neon PostgreSQL. Neon branches are isolated copy-on-write database branches with their own connection strings, and can be created from a point in time within the configured restore window. Keep an independent `pg_dump` artifact as a second recovery path.

## Owners

- **Database operator:** creates the recovery point, dump, and temporary restore target.
- **Release owner:** records deployment identifiers and prevents application traffic from reaching the restore target.
- **Verifier:** runs invariant comparison and signs off independently of the database operator.

One person may fill multiple roles for a small deployment, but each checklist item must still name its operator and timestamp.

## Safety Rules

- Never paste a database URL into this document, a ticket, a Git commit, or terminal output.
- Load `DATABASE_URL` and `RESTORE_DATABASE_URL` from the deployment secret store or an interactive environment that does not persist shell history.
- Use direct PostgreSQL connections for `pg_dump` and `pg_restore`, not a pooled application endpoint.
- Never point Vercel production or preview deployments at the rehearsal database.
- The restore target must be disposable and clearly named with the rehearsal date.
- Do not use `--clean` against production.
- Stop immediately if the source and destination host/database identities are not visibly different.

## Prerequisites

- PostgreSQL client tools compatible with the production PostgreSQL major version.
- Access to create a Neon branch or temporary Neon project/database.
- Permission to read production and administer only the temporary restore target.
- Current application checkout at the release candidate commit.
- Generated Prisma Client: `npm run prisma:generate`.
- Enough encrypted storage for the dump artifact.

## Record Before Starting

- Date and time in UTC
- Application commit SHA
- Neon project and production branch names, without connection credentials
- Production PostgreSQL version
- Configured Neon history-retention window
- Database operator, release owner, and verifier
- Maintenance window planned for the real migration

## Procedure

### 1. Capture the production baseline

Pause source writes until both this capture and the dump in step 2 finish. Alternatively, create an isolated recovery branch first and use that branch as the source for both commands. Capture and dump must describe the same frozen data; an active production source can otherwise create false count or sum mismatches.

With `DATABASE_URL` set to the production direct connection:

```bash
npm run tenant:invariants:capture -- \
  --stage legacy \
  --output /secure/rehearsal/production-before.json
```

Confirm the file is readable JSON and store its checksum with the rehearsal record. Do not edit it.

### 2. Create two recovery artifacts

In the Neon console, create a branch or snapshot from the production branch at the recorded UTC time. The recovery point must precede any migration command.

Also create a portable dump:

```bash
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file=/secure/rehearsal/production.dump \
  "$DATABASE_URL"
```

Record the dump checksum and verify `pg_restore --list /secure/rehearsal/production.dump` exits successfully.

### 3. Provision an isolated restore target

Create a temporary Neon branch or database with no application deployment attached. Set `RESTORE_DATABASE_URL` to its direct connection string.

Before restoring, display only non-secret identity information from both databases:

```sql
SELECT current_database(), current_user, version();
```

Stop if the source and target database identities are the same.

### 4. Restore the portable dump

The target must be empty and disposable:

```bash
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  --dbname="$RESTORE_DATABASE_URL" \
  /secure/rehearsal/production.dump
```

Do not ignore warnings about failed schema or data restoration. Save the sanitized command result with the rehearsal record.

### 5. Verify the restored database

Temporarily set `DATABASE_URL` to the restore target and capture another legacy snapshot:

```bash
npm run tenant:invariants:capture -- \
  --stage legacy \
  --output /secure/rehearsal/restored-before.json

npm run tenant:invariants:verify -- \
  --before /secure/rehearsal/production-before.json \
  --after /secure/rehearsal/restored-before.json
```

The verifier must exit with status zero. Manually confirm:

- all expected schemas and migration records exist
- representative users, products, orders, payments, refunds, and accounting entries are present
- journal debits equal journal credits
- recent order timestamps and totals match production
- no Vercel deployment uses the restore target URL

### 6. Rehearse the tenant migration

Run the release candidate expand/backfill migrations only on the restore target. Capture a tenant snapshot afterward:

```bash
npm run tenant:invariants:capture -- \
  --stage tenant \
  --output /secure/rehearsal/restored-after.json

npm run tenant:invariants:verify -- \
  --before /secure/rehearsal/production-before.json \
  --after /secure/rehearsal/restored-after.json
```

Record migration duration, database size, lock waits, errors, and invariant output. Run the application smoke tests against the restore target from an isolated local environment.

### 7. Close the rehearsal

- Remove the temporary application connection, if one was created.
- Delete the temporary Neon branch/database only after sign-off artifacts are saved.
- Retain the encrypted dump according to the agreed backup-retention policy.
- Remove database URLs from local environment files and shell sessions.
- Record pass/fail, unresolved risks, and the approved production window.

## Stop Conditions

The production migration is blocked when any of these occur:

- dump or restore command exits non-zero
- invariant verification reports any changed count or financial sum
- tenant integrity reports a non-zero value
- journal debits and credits differ
- restore target identity cannot be distinguished from production
- migration requires an undocumented manual data edit
- observed runtime exceeds the maintenance window
- there is no tested rollback operator available for production

## References

- [Neon database branching workflow](https://neon.com/docs/get-started-with-neon/workflow-primer)
- [Neon point-in-time restore](https://neon.com/blog/announcing-point-in-time-restore)
- [Neon PostgreSQL migration tools](https://neon.com/tools)
