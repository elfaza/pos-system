# Milestone N: [Milestone Name]

## Focus

Describe the business outcome this milestone must deliver in one short paragraph.

Example:

Build [capability] so [role/user] can [workflow] while preserving [key constraint].

## Agreement Summary

Use this section to summarize the milestone contract that implementation and QA must follow.

- Product source of truth: `docs/pos-system-spec.md`
- Active delivery boundary: this milestone file
- Design source of truth: `docs/design-guidelines.md`
- Milestone status: `[draft | active | completed]`

## Scope

List the features and workflows included in this milestone.

- [Feature/workflow 1]
- [Feature/workflow 2]
- [Feature/workflow 3]

## Out Of Scope

List adjacent work that must not be implemented in this milestone.

- [Excluded feature/workflow 1]
- [Excluded feature/workflow 2]
- [Future milestone dependency]

## Roles And Permissions

Define which roles can use each workflow. Include both UI access and server-side enforcement.

| Role | Allowed Workflows | Blocked Workflows | Notes |
| --- | --- | --- | --- |
| `admin` | [workflows] | [workflows] | [notes] |
| `cashier` | [workflows] | [workflows] | [notes] |

## Business Rules

Write milestone-specific rules as testable statements. Avoid assumptions from other milestones.

- [Rule 1]
- [Rule 2]
- [Rule 3]

## Data Requirements

Describe new or changed data models, fields, relationships, indexes, and constraints.

### New Models

| Model | Purpose | Key Fields | Notes |
| --- | --- | --- | --- |
| `[model]` | [purpose] | [fields] | [notes] |

### Changed Models

| Model | Change | Reason | Migration Notes |
| --- | --- | --- | --- |
| `[model]` | [change] | [reason] | [notes] |

### Data Rules

- [Validation or constraint rule]
- [Uniqueness/index rule]
- [Migration/seed implication]

## Backend Requirements

Define API, service, repository, transaction, validation, and authorization expectations.

### API Contract

| Method | Route | Permission | Request | Response | Error States |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/[resource]` | [role] | [shape] | [shape] | [errors] |
| `POST` | `/api/[resource]` | [role] | [shape] | [shape] | [errors] |

### Service And Repository Rules

- [Service rule]
- [Repository/data-access rule]
- [Transaction rule]
- [Audit/activity rule if needed]

### Validation And Errors

- [Input validation rule]
- [Business validation rule]
- [Frontend-safe error mapping rule]

## Frontend Requirements

Define pages, components, states, and interactions required for this milestone.

### Screens And Components

| Screen/Component | User Goal | Required States | Notes |
| --- | --- | --- | --- |
| `[screen]` | [goal] | loading, empty, error, disabled, success | [notes] |

### Interaction Rules

- [Workflow interaction rule]
- [Form/table/card behavior]
- [Keyboard/touch/responsive behavior if relevant]

### UI State Requirements

- Loading state: [requirement]
- Empty state: [requirement]
- Error state: [requirement]
- Disabled/offline state: [requirement]
- Success state: [requirement]

## Money And Calculation Rules

Use this section when the milestone touches prices, payments, tax, service charge, discounts, refunds, inventory value, or reporting totals.

- [Calculation rule]
- [Rounding rule]
- [Minor-unit/helper requirement]
- [Snapshot/audit requirement]

## Offline And Connectivity Rules

Define whether workflows require an active connection and what the UI/API must do when offline.

- [Online/offline rule]
- [Blocked action rule]
- [Recovery/retry rule]

## Testing Requirements

List the minimum test coverage expected for this milestone.

### Backend Tests

- [Service test]
- [Repository/API test]
- [Validation/error test]

### Frontend Tests

- [Component/state test]
- [Store/hook test]
- [Workflow test]

### QA Scenarios

- [Happy path]
- [Edge case]
- [Permission failure]
- [Validation failure]
- [Regression risk]

## Acceptance Criteria

Write pass/fail criteria that QA can verify.

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]
- [ ] Documentation compliance checked against `docs/pos-system-spec.md`
- [ ] Documentation compliance checked against this milestone file
- [ ] UI compliance checked against `docs/design-guidelines.md` when UI changes are included
- [ ] Relevant tests and validation commands pass
- [ ] QA verifies the integrated result

## Implementation Notes

Optional notes for sequencing, dependencies, risks, or known constraints.

- [Dependency or prerequisite]
- [Risk]
- [Suggested implementation order]

## Completion Record

Fill this in when the milestone is complete.

- Completed date:
- Final validation commands:
- Known follow-ups:
- Release notes:
