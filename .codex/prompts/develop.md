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

Before planning or editing, read these files in full:

- `docs/pos-system-spec.md`
- the selected milestone file, defaulting to `docs/milestone-1.md`
- `docs/design-guidelines.md`

Before changing any Next.js API, routing convention, layout, route handler, caching behavior, metadata, config, or framework convention, also read the relevant guide in:

- `node_modules/next/dist/docs/`

Treat the selected milestone file as the active delivery boundary. Treat `docs/pos-system-spec.md` as the product and domain source of truth. Treat `docs/design-guidelines.md` as mandatory for UI and UX decisions.

## Operating Rules

1. Work only on the requested task unless another change is required to make it correct.
2. Keep the MVP single-store and online-only.
3. Do not implement features marked out of scope by the selected milestone.
4. Preserve selected milestone business rules. For the current `docs/milestone-1.md` default, this includes: roles are only `admin` and `cashier`; one order has one payment method; product prices are before tax and service charge; tax and service charge are calculated from settings at checkout; held orders never reserve or deduct stock; paid orders deduct tracked stock only after payment is confirmed; server payment status is the source of truth; checkout, hold, payment, refund, and completion actions are blocked while offline.
5. Use the documented architecture: Next.js UI, Next.js Route Handlers, service layer, repository/data-access layer, Prisma/PostgreSQL, TanStack Query for server state, and Zustand for cashier cart/UI state.
6. Use the design guide for every UI change: operational blue and white interface, touch-friendly controls, visible cashier workflow, table-first admin screens, no decorative complexity, and complete loading/empty/error/disabled/offline/success states where relevant.

## Development Workflow

Follow this exact workflow:

1. Restate the task in one concise sentence.
2. State the selected milestone file.
3. Generate a document analysis before implementation.
4. Inspect existing files and identify the smallest coherent implementation path.
5. Create a short implementation checklist mapped to the relevant sections of `docs/pos-system-spec.md`, the selected milestone file, and `docs/design-guidelines.md`.
6. Implement the change using existing project patterns.
7. Add or update focused tests when the project has an adjacent test pattern.
8. Run the most specific useful validation available, such as `npm run lint`, `npm run typecheck`, `npm test`, or targeted test commands if configured.
9. If a validation command is unavailable, report that clearly instead of inventing a result.

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
8. Fix any mismatch found.
9. Re-run the relevant validation command after fixes.
10. Repeat the loop.

Stop the loop only when the implementation, validation result, and documentation checks agree.

## Final Response

Finish with:

- The document analysis generated before implementation.
- What changed, with file paths.
- Which validation commands ran and their results.
- A documentation compliance result covering `docs/pos-system-spec.md`, the selected milestone file, and `docs/design-guidelines.md`.
- Any remaining blocker or follow-up, only if one exists.

## Example Usage

```text
/pos-development:develop milestone-1 implement product category CRUD
/pos-development:develop docs/milestone-1.md add cashier cash payment modal
/pos-development:develop build offline blocking state for checkout actions
```
