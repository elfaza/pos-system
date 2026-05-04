---
description: Develop the POS system against the structured docs, selected milestone scope, and design guidelines
argument-hint: [milestone path or milestone-1] [task to implement]
allowed-tools: [Read, Glob, Grep, Bash, Edit, Write]
---

# POS Development

Use this command to develop the POS system from the structured docs package, selected milestone scope, and existing code patterns.

## Arguments

The user invoked this command with:

```text
$ARGUMENTS
```

Interpret the first argument as the milestone selector when it looks like a milestone name or Markdown path, for example `milestone-1`, `docs/milestone-1.md`, or `docs/milestone-2.md`.

If no milestone selector is provided, use:

```text
docs/milestone-1.md
```

Treat the remaining arguments as the development task. If the milestone selector is ambiguous, infer conservatively and state the milestone file you selected before implementation.

## Required Source Documents

Before planning or editing, read:

- `docs/00-index.md`
- the selected milestone file, defaulting to `docs/milestone-1.md`

Then read only the numbered docs that directly affect the task:

- Product/business scope: `docs/01-project-overview.md`, `docs/02-brd-business-requirements.md`, `docs/03-prd-product-requirements.md`
- Database/schema work: `docs/04-erd-database-design.md`
- API/backend work: `docs/05-api-contract.md`, `docs/06-technical-design.md`
- Planning/scope work: `docs/07-mvp-scope-and-backlog.md`, `docs/09-development-roadmap.md`
- UI/workflow work: `docs/08-ui-ux-specification.md`, `docs/design-guidelines.md`
- Testing/release work: `docs/10-qa-test-plan.md`, `docs/qa/milestone-6-checklist.md`
- Setup/deployment work: `docs/11-environment-setup.md`, `docs/deployment.md`

Use `docs/pos-system-spec.md` as a legacy detailed source when a numbered doc is not specific enough. Do not repeat large sections of the docs in the plan; cite the relevant files and summarize only the constraints that affect the requested task.

Before changing any Next.js API, routing convention, layout, route handler, caching behavior, metadata, config, or framework convention, also read the relevant guide in:

- `node_modules/next/dist/docs/`

The agreement documents are the relevant numbered docs, the selected milestone file, and any legacy detail needed from `docs/pos-system-spec.md`. Treat the selected milestone file as the active delivery boundary. Treat `docs/08-ui-ux-specification.md` and `docs/design-guidelines.md` as mandatory for UI and UX decisions.

Do not begin implementation until the agreement documents have been read and their constraints are reflected in the plan.

## Operating Rules

1. Work only on the requested task unless another change is required to make it correct.
2. Keep the MVP single-store and online-only.
3. Do not implement features marked out of scope by the selected milestone.
4. Preserve all business rules from the selected milestone file. Do not hardcode assumptions from another milestone; if a rule differs between milestones, follow the selected milestone.
5. Use the documented architecture: Next.js UI, Next.js Route Handlers, service layer, repository/data-access layer, Prisma/PostgreSQL, TanStack Query for server state, and Zustand for cashier cart/UI state.
6. Server state is the source of truth for persisted business data. Client state may only manage temporary UI/session workflow state unless the selected milestone says otherwise.
7. When schema changes are needed, update the Prisma schema, migrations, seed data if affected, service/repository logic, tests, and any API/UI assumptions together. Before QA is considered complete, apply the migration to the local development database and verify the live database actually contains the fields, tables, indexes, and enums used by the implementation.
8. When touching protected workflows, verify authentication, role authorization, server-side enforcement, and UI access controls together.
9. For money, tax, discounts, service charge, refunds, and payments, use integer minor units or the project's existing money helpers. Do not use floating-point arithmetic for persisted financial calculations.
10. Backend validation errors must map to clear frontend error states without exposing sensitive internals.
11. Keep commits grouped by logical purpose, such as tests, backend, frontend, QA fixes, and prompt/documentation updates. Do not mix unrelated changes in one commit.
12. Use Conventional Commit messages in the form `type(scope): summary` when a scope is useful, or `type: summary` when it is not. Prefer `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, and `style`; keep the summary imperative, lowercase, and under 72 characters.
13. When changing shared utilities, services, stores, schemas, or types, check all call sites and update affected tests.
14. A task is done only when implementation, tests, live QA verification when applicable, documentation compliance, and final worktree review are complete. Mocked/unit tests, lint, and production build are not sufficient QA for database-backed or API-backed workflows.
15. Use the design guide for every UI change: operational blue and white interface, touch-friendly controls, visible cashier workflow, table-first admin screens, no decorative complexity, and complete loading/empty/error/disabled/offline/success states where relevant.
16. After each completed milestone, increase the app version with SemVer before final verification. Use `npm version patch --no-git-tag-version` for regular milestone completion, `npm version minor --no-git-tag-version` when the milestone introduces a substantial new capability, and `npm version major --no-git-tag-version` only for intentional breaking changes. Keep `package.json` and `package-lock.json` in sync through npm; do not hand-edit only one version field.

## Development Workflow

Follow this exact workflow:

1. Restate the task in one concise sentence.
2. State the selected milestone file.
3. Generate a concise document analysis before implementation.
4. Confirm the relevant docs have been read and identify only the constraints they add to the work.
5. Inspect existing files and identify the smallest coherent implementation path.
6. Create a short implementation checklist mapped to the relevant numbered docs, the selected milestone file, and UI docs when applicable.
7. Before parallel work starts, define the frontend/backend contract when both sides are involved: API route, request shape, response shape, error states, permissions, and loading/empty/error UI expectations.
8. Use the three-agent workflow when the task has separable backend, frontend, and QA concerns. If the task is docs-only or single-scope, note why fewer agents are enough.
9. Before agents work in parallel, publish a shared kickoff note containing: selected docs, selected milestone, acceptance checklist, API/UI contract if any, and file ownership.
10. Assign clear ownership:
   - `backend agent`: API routes, services, repositories, Prisma/database behavior, auth/authorization, validation, transactions, backend architecture boundaries, and backend tests.
   - `frontend agent`: pages, components, state management, data fetching hooks, UI states, accessibility, responsive behavior, UI docs compliance, and frontend tests.
   - `qa agent`: independent verification against relevant docs, milestone acceptance, regression risk, edge cases, integration behavior, live API/database checks when applicable, and validation commands.
11. Keep backend and frontend work parallel only when write scopes are distinct. Agents must work with existing changes and must not revert or overwrite another agent's files.
12. Backend and frontend agents must align on contracts before either side implements incompatible assumptions. Contract changes must be announced and accepted by both sides before integration.
13. Each implementation agent must finish with: files changed, behavior implemented, tests/validation run, contract changes made, risks found, and remaining blockers if any.
14. QA starts from the integrated result, not from isolated agent claims. QA must report pass/fail against the acceptance checklist and identify the owning agent for each finding.
15. If QA reports an error, route it back to the owner: backend for API/data/business-rule failures, frontend for UI/state/accessibility/workflow failures, or both for contract mismatches. Re-run QA after fixes until QA passes or a real blocker is found.
16. Do not stop at planning, partial implementation, or unanswered internal uncertainty. Continue through implementation, integration, QA, fixes, and validation unless there is a real blocker that requires a user decision.
17. Ask the user a question only for blocker decisions that cannot be resolved from the agreement documents, existing code, or conservative implementation assumptions.
18. Implement the change using existing project patterns.
19. Add or update focused tests when the project has an adjacent test pattern.
20. If the task completes a milestone, bump the app version according to the Operating Rules before final validation.
21. Run `npm test` after adding or changing tests. Also run the most specific useful validation available for the change, such as `npm run lint`, `npm run typecheck`, or targeted test commands if configured.
22. If the task changes Prisma schema, migrations, repositories, services, Route Handlers, authenticated workflows, checkout/payment/order state, inventory state, kitchen/queue state, or any persisted business workflow, perform live QA against the real local database after migrations are applied. Start or reuse the local dev server and exercise the changed Route Handlers with browser interaction, `curl`, or a small `npx tsx` smoke script that calls the same service/API path. Verify fresh server logs or command output show successful responses for changed routes and representative mutations, not 500s.
23. If live QA reveals an issue missed by mocked tests or build validation, fix it, rerun migrations/generation if needed, rerun tests/lint/build, and repeat the live API/database check before final response.
24. If a validation command is unavailable, report that clearly instead of inventing a result.

## Document Analysis

Before implementation, produce a concise but concrete document analysis with these sections:

- `Docs Used`: list only the numbered docs, milestone docs, and legacy docs read for this task.
- `Product/Business Rules`: summarize the product rules, domain constraints, and data/workflow requirements that apply to the task.
- `Selected Milestone`: summarize the selected milestone scope, required outputs, business rules, and explicitly out-of-scope items that apply to the task.
- `UI/UX Rules`: when relevant, summarize layout, UI states, responsive behavior, styling, accessibility, and interaction rules from `docs/08-ui-ux-specification.md` and `docs/design-guidelines.md`.
- `Agent Coordination`: state whether backend, frontend, and QA agents are needed, their ownership, and the integration contract.
- `Implementation Implications`: translate the document findings into concrete engineering constraints, affected modules, validation needs, and risks.
- `Acceptance Checklist`: list the doc-backed checks that must pass before the task is considered complete.

Keep the analysis tied to the selected task. Do not summarize unrelated parts of the documents unless they affect implementation boundaries.

## Documentation Compliance Loop

After implementation, run this loop until no required fixes remain or a real blocker is found:

1. Compare the change against the selected milestone file.
2. Compare the change against the relevant numbered docs from `docs/00-index.md`.
3. Compare the change against `docs/pos-system-spec.md` only when it was used for missing legacy detail.
4. Compare the change against `docs/08-ui-ux-specification.md` and `docs/design-guidelines.md` if any UI, layout, styling, or user workflow changed.
5. Check for accidental out-of-scope work.
6. Check online-only guards and role boundaries when the task touches orders, payments, auth, refunds, stock, or cashier/admin pages.
7. Check transaction correctness when the task touches checkout: totals, tax, service charge, discounts, payment state, stock deduction timing, order item snapshots, and activity logs.
8. Check UX states when the task touches UI: loading, empty, error, disabled, offline, and success.
9. Check live database readiness when schema or persisted workflows changed: migration applied, Prisma Client regenerated when needed, and the local database actually contains the fields/tables/enums used by the implementation.
10. Check live API/server behavior for changed routes and workflows. A passing build is not enough; hit the changed endpoints or exercise the UI against the running dev server and confirm the server returns expected 2xx/4xx business responses, not 500s.
11. Have the QA agent test the integrated frontend and backend result against the acceptance checklist, including live API/database verification when applicable, then route any findings through the frontend/backend ownership workflow.
12. Fix any mismatch found.
13. Re-run the relevant validation command after fixes.
14. Repeat the loop.

Stop the loop only when the implementation, validation result, and documentation checks agree.

## Final Response

Finish with:

- The document analysis generated before implementation.
- What changed, with file paths.
- Whether a milestone version bump was required, and the resulting version when it was.
- Which validation commands ran and their results.
- A three-agent coordination summary when agents were used: backend result, frontend result, QA result, contract changes, and who fixed QA findings.
- A QA result showing whether the integrated feature passed and which live API/database checks were performed when applicable.
- A documentation compliance result covering the selected milestone file, relevant numbered docs, legacy `docs/pos-system-spec.md` where used, and UI docs where applicable.
- A worktree check that separates task changes from pre-existing unrelated changes.
- Any remaining blocker or follow-up, only if one exists.
