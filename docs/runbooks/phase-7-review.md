# Phase 7 Review: Release Verification

**Status:** Local verification complete. Production release verification remains blocked on a restored production snapshot, production-specific credentials, and browser review against the intended deployment.

**Branch:** `feature/multi-tenant-organizations-outlets`

## Verified on the disposable PostgreSQL environment

- `npm test`: 54 test files passed; 252 passed, 1 skipped. This includes live PostgreSQL schema, settings, checkout, inventory, and RLS integration suites.
- `npm run lint`: passed.
- `npx prisma validate`: passed.
- `npm run build`: passed after allowing the configured Google Fonts fetch for Inter.
- `prisma migrate status`: the disposable test database has all 19 migrations applied and no pending migrations.
- The deterministic legacy fixture migration test passed during Phase 6; it applied the 13-to-19 migration path and verified tenant invariants.
- The saved comparison from the synthetic pre-migration fixture through contract/RLS passed: [invariant comparison inputs](phase-6-invariants-before.json) and [final state](phase-6-invariants-after-contract.json).

## Code and isolation evidence

The PostgreSQL RLS test switches to `pos_runtime`, the same restricted role intended for the app connection, and checks missing context and guessed cross-tenant IDs in the database. For example:

```ts
return prisma.$transaction(async (transaction) => {
  await transaction.$executeRaw`SET LOCAL ROLE pos_runtime`;
  if (context) await setDatabaseTenantContext(transaction, context);
  return callback(transaction);
});
```

The test suite covers database isolation and representative tenant-aware service paths. It is not an exhaustive proof for every public API route or an end-to-end browser workflow.

## Not verified

- No production restore point, production database, or production credentials were provided. The synthetic fixture is not a substitute for a restored production snapshot.
- Browser sign-in, outlet switching, POS checkout, receipt, kitchen, queue, customer display, and the reporting/finance screens were not exercised in a browser.
- The actual deployment runtime login has not been verified as a member of `pos_runtime` without superuser or `BYPASSRLS` privileges.
- No production backup, maintenance window, traffic pause, deploy, or production migration has been performed.

## Release boundary

Phase 7's local checks are complete, but production rollout in Task 21 is not. Before deployment, the release owner and database operator must run the restore rehearsal, inspect the real-data invariant reports, verify runtime and migration roles, create and verify the backup, and approve the maintenance window. Production migrations and deployment have intentionally not been run.
