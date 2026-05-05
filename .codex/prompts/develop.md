---
description: Develop the POS system against the structured docs and design guidelines
argument-hint: [task to implement] [optional: --parallel]
allowed-tools: [Read, Glob, Grep, Bash, Edit, Write]
---

# POS Development

Use this command to develop the POS system from the structured docs package and existing code patterns.

## Arguments

The user invoked this command with:

```text
$ARGUMENTS
```

Treat all arguments as the development task. The numbered docs are the source of truth.

## Parallel Agent Authorization

This prompt is intended to authorize Codex to use parallel sub-agents when the active runtime allows it. When the task has separable backend, frontend, and QA concerns, treat the user's invocation of `/prompts:develop` as an explicit request for parallel agent work for that task.

Use fewer or no sub-agents only when:

- The active runtime explicitly blocks sub-agent usage.
- The task is docs-only, single-file, or too small to benefit from delegation.
- The next critical-path action is blocked on context that must be gathered locally first.
- The user explicitly asks not to use agents or asks for local-only work.

If the active runtime requires a direct user wording for delegation beyond this prompt file, tell the user to invoke the task with `--parallel` or with a sentence such as `use backend, frontend, and QA sub-agents`.

## Required Source Documents

Before planning or editing, read:

- `docs/00-index.md`

Then read only the numbered docs that directly affect the task:

- Product/business scope: `docs/01-project-overview.md`, `docs/02-brd-business-requirements.md`, `docs/03-prd-product-requirements.md`
- Database/schema work: `docs/04-erd-database-design.md`
- API/backend work: `docs/05-api-contract.md`, `docs/06-technical-design.md`
- Planning/scope work: `docs/07-mvp-scope-and-backlog.md`, `docs/09-development-roadmap.md`
- UI/workflow work: `docs/08-ui-ux-specification.md`, `docs/design-guidelines.md`
- Testing/release work: `docs/10-qa-test-plan.md`, `docs/qa/release-checklist.md`
- Setup/deployment work: `docs/11-environment-setup.md`, `docs/deployment.md`
- Configurability/module enablement work: `docs/12-configurability-analysis.md`
- Test specification work for every development task: `docs/13-test-case-matrix.md`

Use `docs/pos-system-spec.md` as a legacy detailed source only when a numbered doc is not specific enough. Do not repeat large sections of the docs in the plan; cite the relevant files and summarize only constraints that affect the task.

Always read `docs/12-configurability-analysis.md` and `docs/13-test-case-matrix.md` before implementation when the task touches modules, feature flags, settings, payments, checkout, inventory, kitchen, queue, reporting, accounting, auth access, API routes, persisted workflows, or tests. For trivial docs-only edits that cannot affect application behavior, state why those docs are not applicable.

Every `/prompts:develop` run must derive task-specific test specs from `docs/13-test-case-matrix.md` before code changes. The specs must include:

- Relevant configuration tests, including enabled and disabled module behavior where applicable.
- Relevant function-level tests for services, repositories, utilities, stores, actions, and mappers touched by the task.
- Relevant API/route tests for changed endpoints, including unauthorized, forbidden, validation, success, and disabled-module behavior where applicable.
- Relevant module flow tests for affected user workflows.
- Relevant edge cases, especially money, stock, queue numbers, sessions, accounting balance, concurrency, stale UI, and invalid configuration combinations.
- Any matrix gaps discovered during analysis, with a note to update `docs/13-test-case-matrix.md` when a new behavior has no existing test case ID.

Before changing any Next.js API, routing convention, layout, route handler, caching behavior, metadata, config, or framework convention, also read the relevant guide in:

- `node_modules/next/dist/docs/`

Do not begin implementation until the relevant docs have been read and their constraints are reflected in the plan.

## Operating Rules

1. Work only on the requested task unless another change is required to make it correct.
2. Keep the MVP single-store and online-only unless the docs are explicitly updated first.
3. Do not implement features marked out of scope by the numbered docs.
4. Preserve documented business rules. If docs conflict, stop and resolve the conflict before implementation.
5. Use the documented architecture: Next.js UI, Next.js Route Handlers, service layer, repository/data-access layer, Prisma/PostgreSQL, TanStack Query for server state, and Zustand for cashier cart/UI state.
6. Server state is the source of truth for persisted business data. Client state may only manage temporary UI/session workflow state unless the docs say otherwise.
7. When schema changes are needed, update the Prisma schema, migrations, seed data if affected, service/repository logic, tests, and any API/UI assumptions together. Before QA is considered complete, apply the migration to the local development database and verify the live database actually contains the fields, tables, indexes, and enums used by the implementation.
8. When touching protected workflows, verify authentication, role authorization, server-side enforcement, and UI access controls together.
9. For money, tax, discounts, service charge, refunds, payments, inventory value, and accounting values, use integer minor units or the project's existing money helpers. Do not use floating-point arithmetic for persisted financial calculations.
10. Backend validation errors must map to clear frontend error states without exposing sensitive internals.
11. Keep commits grouped by logical purpose, such as tests, backend, frontend, QA fixes, and prompt/documentation updates. Do not mix unrelated changes in one commit.
12. Use Conventional Commit messages in the form `type(scope): summary` when a scope is useful, or `type: summary` when it is not. Prefer `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, and `style`; keep the summary imperative, lowercase, and under 72 characters.
13. When changing shared utilities, services, stores, schemas, or types, check all call sites and update affected tests.
14. A task is done only when implementation, tests, live QA verification when applicable, documentation compliance, and final worktree review are complete. Mocked/unit tests, lint, and production build are not sufficient QA for database-backed or API-backed workflows.
15. Use the UI docs for every UI change: operational blue and white interface, touch-friendly controls, visible cashier workflow, table-first admin screens, no decorative complexity, and complete loading/empty/error/disabled/offline/success states where relevant.
16. When a change completes a documented versioned release scope, increase the app version with SemVer before final verification. Use `npm version patch --no-git-tag-version` for regular release completion, `npm version minor --no-git-tag-version` when the release introduces a substantial new capability, and `npm version major --no-git-tag-version` only for intentional breaking changes. Keep `package.json` and `package-lock.json` in sync through npm; do not hand-edit only one version field.

## Development Workflow

Follow this exact workflow:

1. Restate the task in one concise sentence.
2. Generate a concise document analysis before implementation.
3. Confirm the relevant docs have been read and identify only the constraints they add to the work.
4. Inspect existing files and identify the smallest coherent implementation path.
5. Generate a task-specific test specification from `docs/13-test-case-matrix.md`, including exact relevant test IDs when they exist and new proposed IDs when they do not.
6. Create a short implementation checklist mapped to the relevant numbered docs, configurability docs, test matrix IDs, and UI docs when applicable.
7. Before parallel work starts, define the frontend/backend contract when both sides are involved: API route, request shape, response shape, error states, permissions, module-flag behavior, and loading/empty/error/disabled UI expectations.
8. Use the three-agent workflow when the task has separable backend, frontend, and QA concerns. If the task is docs-only or single-scope, note why fewer agents are enough.
9. Before agents work in parallel, publish a shared kickoff note containing: selected docs, task-specific test specs/test IDs, acceptance checklist, API/UI contract if any, module configuration expectations if any, and file ownership.
10. Assign clear ownership:
   - `backend agent`: API routes, services, repositories, Prisma/database behavior, auth/authorization, validation, transactions, backend architecture boundaries, and backend tests.
   - `frontend agent`: pages, components, state management, data fetching hooks, UI states, accessibility, responsive behavior, UI docs compliance, and frontend tests.
   - `qa agent`: final-gate verification after backend/frontend integration. The QA agent independently tests against relevant docs, task-specific test specs/test IDs, acceptance criteria, regression risk, edge cases, integration behavior, module configuration behavior, live API/database checks when applicable, and validation commands.
11. Keep backend and frontend work parallel only when write scopes are distinct. Agents must work with existing changes and must not revert or overwrite another agent's files.
12. Backend and frontend agents must align on contracts before either side implements incompatible assumptions. Contract changes must be announced and accepted by both sides before integration.
13. Each implementation agent must finish with: files changed, behavior implemented, tests/validation run, contract changes made, risks found, and remaining blockers if any.
14. QA starts at the ending phase from the integrated result, not from isolated agent claims. Do not treat backend or frontend work as complete until QA has tested the integrated result and reported pass/fail against the task-specific test specs, acceptance checklist, and configuration expectations.
15. If QA reports an error, call the owning agent back in only as needed: backend for API/data/business-rule failures, frontend for UI/state/accessibility/workflow failures, or both for contract mismatches. The owning agent must fix the finding, report files changed and validation run, then hand the integrated result back to QA.
16. Re-run QA after fixes until QA passes or a real blocker is found. QA remains the final gate before the final user response.
17. Do not stop at planning, partial implementation, or unanswered internal uncertainty. Continue through implementation, integration, QA, fixes, and validation unless there is a real blocker that requires a user decision.
18. Ask the user a question only for blocker decisions that cannot be resolved from the docs, existing code, or conservative implementation assumptions.
19. Implement the change using existing project patterns.
20. Add or update focused tests when the project has an adjacent test pattern. If a relevant test case exists in `docs/13-test-case-matrix.md`, reference its ID in the implementation notes or test name where practical.
21. If the task completes a versioned release scope, bump the app version according to the Operating Rules before final validation.
22. Run `npm test` after adding or changing tests. Also run the most specific useful validation available for the change, such as `npm run lint`, `npm run typecheck`, or targeted test commands if configured.
23. If the task changes Prisma schema, migrations, repositories, services, Route Handlers, authenticated workflows, checkout/payment/order state, inventory state, accounting state, kitchen/queue state, settings, module flags, or any persisted business workflow, perform live QA against the real local database after migrations are applied. Start or reuse the local dev server and exercise the changed Route Handlers with browser interaction, `curl`, or a small `npx tsx` smoke script that calls the same service/API path. Verify fresh server logs or command output show successful responses for changed routes and representative mutations, not 500s.
24. If live QA reveals an issue missed by mocked tests or build validation, call the owning backend/frontend agent back in when needed, fix it, rerun migrations/generation if needed, rerun tests/lint/build, and repeat QA before final response.
25. If a validation command is unavailable, report that clearly instead of inventing a result.

## Document Analysis

Before implementation, produce a concise but concrete document analysis with these sections:

- `Docs Used`: list only the numbered docs and legacy docs read for this task.
- `Product/Business Rules`: summarize the product rules, domain constraints, and data/workflow requirements that apply to the task.
- `Scope Boundary`: summarize applicable in-scope, out-of-scope, dependency, and acceptance requirements.
- `UI/UX Rules`: when relevant, summarize layout, UI states, responsive behavior, styling, accessibility, and interaction rules from `docs/08-ui-ux-specification.md` and `docs/design-guidelines.md`.
- `Configurability Rules`: summarize relevant module flags, settings behavior, enabled/disabled module expectations, and side-effect rules from `docs/12-configurability-analysis.md`.
- `Task-Specific Test Specs`: list relevant test IDs from `docs/13-test-case-matrix.md`, grouped by configuration, function, API, flow, and edge case coverage. If no exact ID exists for required behavior, define the missing test spec and note that the matrix should be updated.
- `Agent Coordination`: state whether backend, frontend, and QA agents are needed, their ownership, and the integration contract.
- `Implementation Implications`: translate the document findings into concrete engineering constraints, affected modules, validation needs, and risks.
- `Acceptance Checklist`: list the doc-backed checks that must pass before the task is considered complete.

Keep the analysis tied to the selected task. Do not summarize unrelated parts of the documents unless they affect implementation boundaries.

## Documentation Compliance Loop

After implementation, run this loop until no required fixes remain or a real blocker is found:

1. Compare the change against the relevant numbered docs from `docs/00-index.md`.
2. Compare the change against `docs/pos-system-spec.md` only when it was used for missing legacy detail.
3. Compare the change against `docs/08-ui-ux-specification.md` and `docs/design-guidelines.md` if any UI, layout, styling, or user workflow changed.
4. Compare module and settings behavior against `docs/12-configurability-analysis.md` when the task touches configuration, settings, module availability, optional side effects, or a configurable workflow.
5. Compare implemented or updated tests against the task-specific test specs derived from `docs/13-test-case-matrix.md`. Required test specs must be implemented, explicitly deferred with rationale, or documented as not applicable.
6. Check for accidental out-of-scope work.
7. Check online-only guards and role boundaries when the task touches orders, payments, auth, refunds, stock, accounting, or cashier/admin pages.
8. Check transaction correctness when the task touches checkout: totals, tax, service charge, discounts, payment state, stock deduction timing, order item snapshots, accounting entry timing, module-enabled side effects, and activity logs.
9. Check UX states when the task touches UI: loading, empty, error, disabled, offline, success, and disabled-module states.
10. Check live database readiness when schema or persisted workflows changed: migration applied, Prisma Client regenerated when needed, and the local database actually contains the fields/tables/enums used by the implementation.
11. Check live API/server behavior for changed routes and workflows. A passing build is not enough; hit the changed endpoints or exercise the UI against the running dev server and confirm the server returns expected 2xx/4xx business responses, not 500s.
12. Have the QA agent test the integrated frontend and backend result at the ending phase against the acceptance checklist and task-specific test specs, including live API/database verification when applicable.
13. If QA finds a mismatch, call the relevant frontend/backend agent back in as needed, route the finding through ownership, and require that agent to report the fix and validation performed.
14. Re-run the relevant validation command and have QA retest after fixes.
15. Repeat the loop until QA passes or a real blocker is found.

Stop the loop only when the implementation, validation result, and documentation checks agree.

## Final Response

Finish with:

- The document analysis generated before implementation.
- What changed, with file paths.
- Whether a version bump was required, and the resulting version when it was.
- Which validation commands ran and their results.
- The task-specific test specs used, including matrix IDs covered and any required specs deferred with rationale.
- A three-agent coordination summary when agents were used: backend result, frontend result, final QA result, contract changes, whether QA called frontend/backend back in, and who fixed QA findings.
- A QA result showing whether the integrated feature passed and which live API/database checks were performed when applicable.
- A documentation compliance result covering relevant numbered docs, `docs/12-configurability-analysis.md`, `docs/13-test-case-matrix.md`, legacy `docs/pos-system-spec.md` where used, and UI docs where applicable.
- A worktree check that separates task changes from pre-existing unrelated changes.
- Any remaining blocker or follow-up, only if one exists.
