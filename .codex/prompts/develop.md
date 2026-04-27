---
description: Develop the POS system against the product spec, selected milestone scope, and design guidelines
argument-hint: [milestone path or milestone-1] [task to implement]
allowed-tools: [Read, Glob, Grep, Bash, Edit, Write]
---

# POS Development

Use this command to develop the POS system from the required project documents and the selected milestone.

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

Before planning or editing, read these source documents in full:

- `docs/pos-system-spec.md`
- the selected milestone file, defaulting to `docs/milestone-1.md`
- `docs/design-guidelines.md`

Before changing any Next.js API, routing convention, layout, route handler, caching behavior, metadata, config, or framework convention, also read the relevant guide in:

- `node_modules/next/dist/docs/`

The agreement documents are `docs/pos-system-spec.md` and the selected milestone file. Treat the selected milestone file as the active delivery boundary, based on the milestone requested by the user. Treat `docs/pos-system-spec.md` as the product and domain source of truth. Treat `docs/design-guidelines.md` as mandatory for UI and UX decisions.

Do not begin implementation until the agreement documents have been read and their constraints are reflected in the plan.

## Operating Rules

1. Work only on the requested task unless another change is required to make it correct.
2. Keep the MVP single-store and online-only.
3. Do not implement features marked out of scope by the selected milestone.
4. Preserve all business rules from the selected milestone file. Do not hardcode assumptions from another milestone; if a rule differs between milestones, follow the selected milestone.
5. Use the documented architecture: Next.js UI, Next.js Route Handlers, service layer, repository/data-access layer, Prisma/PostgreSQL, TanStack Query for server state, and Zustand for cashier cart/UI state.
6. Server state is the source of truth for persisted business data. Client state may only manage temporary UI/session workflow state unless the selected milestone says otherwise.
7. When schema changes are needed, update the Prisma schema, migrations, seed data if affected, service/repository logic, tests, and any API/UI assumptions together.
8. When touching protected workflows, verify authentication, role authorization, server-side enforcement, and UI access controls together.
9. For money, tax, discounts, service charge, refunds, and payments, use integer minor units or the project's existing money helpers. Do not use floating-point arithmetic for persisted financial calculations.
10. Backend validation errors must map to clear frontend error states without exposing sensitive internals.
11. Keep commits grouped by logical purpose, such as tests, backend, frontend, QA fixes, and prompt/documentation updates. Do not mix unrelated changes in one commit.
12. When changing shared utilities, services, stores, schemas, or types, check all call sites and update affected tests.
13. A task is done only when implementation, tests, QA verification, documentation compliance, and final worktree review are complete.
14. Use the design guide for every UI change: operational blue and white interface, touch-friendly controls, visible cashier workflow, table-first admin screens, no decorative complexity, and complete loading/empty/error/disabled/offline/success states where relevant.

## Development Workflow

Follow this exact workflow:

1. Restate the task in one concise sentence.
2. State the selected milestone file.
3. Generate a document analysis before implementation.
4. Confirm the agreement documents have been read and identify any constraints they add to the work.
5. Inspect existing files and identify the smallest coherent implementation path.
6. Create a short implementation checklist mapped to the relevant sections of `docs/pos-system-spec.md`, the selected milestone file, and `docs/design-guidelines.md`.
7. Before parallel work starts, define the frontend/backend contract when both sides are involved: API route, request shape, response shape, error states, permissions, and loading/empty/error UI expectations.
8. Split feature work across parallel agents when the task has separable frontend, backend, and QA concerns:
   - `backend agent`: acts as a senior backend engineer and owns API routes, services, repositories, Prisma/database behavior, auth/authorization, validation, transactions, backend architecture boundaries, and backend tests.
   - `frontend agent`: acts as a senior frontend engineer and owns pages, components, state management, data fetching hooks, UI states, accessibility, responsive behavior, design-guideline compliance, and frontend tests.
   - `qa agent`: acts as a senior QA engineer and owns independent verification against the source documents, acceptance checklist, regression risk, edge cases, integration behavior, and validation commands.
9. Keep frontend and backend work parallel only when their write scopes are distinct. Define each agent's file ownership before work starts, and do not let one agent revert or overwrite another agent's changes.
10. Each agent must finish with: files changed, behavior implemented, tests/validation run, risks found, and remaining blockers if any.
11. Treat each feature as incomplete until the backend and frontend agents report their slice complete and the QA agent has tested the integrated result.
12. If QA reports an error, route the issue back to the owning agent (`backend agent` for API/data/business-rule failures, `frontend agent` for UI/state/accessibility/workflow failures, or both for integration contract failures). Re-run QA after the fix. Repeat until QA passes or a real blocker is found.
13. Do not stop at planning, partial implementation, or unanswered internal uncertainty. Continue through implementation, integration, QA, fixes, and validation unless there is a real blocker that requires a user decision.
14. Ask the user a question only for blocker decisions that cannot be resolved from the agreement documents, existing code, or conservative implementation assumptions.
15. Implement the change using existing project patterns.
16. Add or update focused tests when the project has an adjacent test pattern.
17. Run `npm test` after adding or changing tests. Also run the most specific useful validation available for the change, such as `npm run lint`, `npm run typecheck`, or targeted test commands if configured.
18. If a validation command is unavailable, report that clearly instead of inventing a result.

## Document Analysis

Before implementation, produce a concise but concrete document analysis with these sections:

- `Product Spec`: summarize the product rules, domain constraints, architecture requirements, and data/workflow requirements from `docs/pos-system-spec.md` that apply to the task.
- `Selected Milestone`: summarize the selected milestone scope, required outputs, business rules, and explicitly out-of-scope items that apply to the task.
- `Design Guidelines`: summarize relevant layout, UI states, responsive behavior, styling, accessibility, and interaction rules from `docs/design-guidelines.md`.
- `Implementation Implications`: translate the document findings into concrete engineering constraints, affected modules, validation needs, and risks.
- `Acceptance Checklist`: list the doc-backed checks that must pass before the task is considered complete.

Keep the analysis tied to the selected task. Do not summarize unrelated parts of the documents unless they affect implementation boundaries.

## Documentation Compliance Loop

After implementation, run this loop until no required fixes remain or a real blocker is found:

1. Compare the change against `docs/pos-system-spec.md`.
2. Compare the change against the selected milestone file.
3. Compare the change against `docs/design-guidelines.md` if any UI, layout, styling, or user workflow changed.
4. Check for accidental out-of-scope work.
5. Check online-only guards and role boundaries when the task touches orders, payments, auth, refunds, stock, or cashier/admin pages.
6. Check transaction correctness when the task touches checkout: totals, tax, service charge, discounts, payment state, stock deduction timing, order item snapshots, and activity logs.
7. Check UX states when the task touches UI: loading, empty, error, disabled, offline, and success.
8. Have the QA agent test the integrated frontend and backend result against the acceptance checklist, then route any findings through the frontend/backend ownership workflow.
9. Fix any mismatch found.
10. Re-run the relevant validation command after fixes.
11. Repeat the loop.

Stop the loop only when the implementation, validation result, and documentation checks agree.

## Final Response

Finish with:

- The document analysis generated before implementation.
- What changed, with file paths.
- Which validation commands ran and their results.
- A QA result showing whether the integrated feature passed, and which agent fixed any QA findings.
- A documentation compliance result covering `docs/pos-system-spec.md`, the selected milestone file, and `docs/design-guidelines.md`.
- A worktree check that separates task changes from pre-existing unrelated changes.
- Any remaining blocker or follow-up, only if one exists.
