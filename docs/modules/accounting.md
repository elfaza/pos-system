# Accounting Module

## Status

MVP scope, not implemented yet.

## Purpose

The accounting module gives admin/owner users a basic operational accounting layer for a single-store cafe. It connects POS sales, cash movement, expenses, and daily close records without replacing the order, payment, inventory, or dashboard source data.

This is not an audited accounting system. It is intended to help the owner understand cash position, sales journals, expenses, and day-end differences.

## Users And Permissions

| Role | Allowed Workflows | Blocked Workflows |
| --- | --- | --- |
| `admin` | Manage chart of accounts, view journals, record expenses, record cash in/out, close day, view accounting reports | None within MVP accounting scope |
| `cashier` | None by default | Accounting dashboard, journals, expenses, cash adjustments, close day, reports |

Rules:

- Accounting APIs must require authentication.
- Accounting mutation APIs are admin-only.
- Cashier users must receive forbidden responses for accounting routes.
- Accounting UI navigation must be hidden from cashier users.

## Scope

- Chart of accounts for MVP accounting categories.
- Sales journal entries generated from paid orders.
- Cash ledger for cash sales, cash in, cash out, and daily close.
- Expense categories and expense recording.
- Daily close records with expected cash, counted cash, and difference.
- Accounting reports:
  - cash ledger
  - income and expense summary
  - journal entry history
  - daily close history
- Activity logs for accounting mutations.

## Out Of Scope

- Tax filing.
- Payroll.
- Bank reconciliation.
- Multi-store accounting.
- Automated depreciation.
- Accounts payable and receivable aging.
- Invoice management.
- Audited accounting-grade financial statements.
- External accounting software integration.
- Active refund processing workflow.

## Business Rules

- Paid POS orders remain the source of truth for sales.
- Accounting entries must not mutate paid orders, payments, receipts, stock movements, or kitchen/queue state.
- Cash checkout should create or be represented by a sales journal entry and cash ledger entry.
- Accounting entry generation must be idempotent for each source order/payment.
- Manual expenses require date, category/account, amount, payment source, description/reason, and actor.
- Manual cash in/out requires amount, direction, reason, date, and actor.
- Daily close compares expected cash against counted cash for a business date.
- Daily close does not modify paid order or payment records.
- Accounting reports use persisted accounting records and POS source references.
- Monetary values must use decimal-safe helpers or integer minor units.

## Data Requirements

### New Models

| Model | Purpose | Key Fields | Notes |
| --- | --- | --- | --- |
| `accounts` | Chart of accounts | `id`, `code`, `name`, `type`, `is_active` | Type examples: asset, income, expense, liability, equity |
| `journal_entries` | Accounting transaction header | `id`, `entry_number`, `source_type`, `source_id`, `business_date`, `description`, `created_by_user_id`, `created_at` | Source examples: order, expense, cash_movement, daily_close |
| `journal_entry_lines` | Debit/credit lines | `id`, `journal_entry_id`, `account_id`, `debit_amount`, `credit_amount` | Entry must balance |
| `expense_categories` | Operational expense grouping | `id`, `name`, `account_id`, `is_active` | Linked to expense account |
| `expenses` | Manual expenses | `id`, `category_id`, `amount`, `business_date`, `payment_source`, `description`, `created_by_user_id` | Creates journal entry |
| `cash_movements` | Manual cash in/out | `id`, `type`, `amount`, `business_date`, `reason`, `created_by_user_id` | Type: cash_in, cash_out |
| `daily_closes` | Day-end cash close | `id`, `business_date`, `expected_cash_amount`, `counted_cash_amount`, `difference_amount`, `closed_by_user_id`, `closed_at` | Unique per business date |

### Changed Models

| Model | Change | Reason |
| --- | --- | --- |
| `orders` | Optional accounting source relation or source lookup by id | Sales journal traceability |
| `payments` | Optional accounting source relation or source lookup by id | Cash ledger traceability |
| `activity_logs` | Add accounting actions | Audit trail |

### Data Rules

- `accounts.code` must be unique.
- `journal_entries.entry_number` must be unique.
- Journal entry lines must balance: total debit equals total credit.
- A paid order may produce at most one sales journal entry.
- A daily close is unique per business date.
- Amounts must be greater than zero except calculated difference fields.

## API Contract

| Method | Route | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/accounting/accounts` | Admin | List accounts |
| `POST` | `/api/accounting/accounts` | Admin | Create account |
| `PATCH` | `/api/accounting/accounts/[id]` | Admin | Update account |
| `GET` | `/api/accounting/journal-entries` | Admin | List journal entries |
| `GET` | `/api/accounting/expenses` | Admin | List expenses |
| `POST` | `/api/accounting/expenses` | Admin | Record expense |
| `GET` | `/api/accounting/cash-movements` | Admin | List cash movements |
| `POST` | `/api/accounting/cash-movements` | Admin | Record cash in/out |
| `GET` | `/api/accounting/daily-closes` | Admin | List daily closes |
| `POST` | `/api/accounting/daily-closes` | Admin | Close business date |
| `GET` | `/api/accounting/reports` | Admin | Accounting report summary |

Error behavior:

- Return forbidden for cashier users.
- Reject unbalanced journal entries.
- Reject duplicate close for the same business date.
- Reject duplicate generated accounting entry for the same paid order/payment.
- Return frontend-safe validation errors.

## UI Requirements

| Screen | User Goal | Required States |
| --- | --- | --- |
| Accounting Overview | See cash, income, expenses, and close status | loading, empty, error, offline |
| Chart Of Accounts | Manage account list | loading, empty, error, disabled, success |
| Journal Entries | Inspect generated and manual entries | loading, empty, error, filtered |
| Expenses | Record and review expenses | loading, empty, error, disabled, success |
| Cash Movements | Record cash in/out | loading, empty, error, disabled, success |
| Daily Close | Count cash and close business date | loading, empty, error, disabled, success |
| Accounting Reports | Review income/expense and cash ledger summaries | loading, empty, error, filtered |

UI rules:

- Accounting screens are admin-only.
- Use table-first admin layouts.
- Forms should validate amount, date, account/category, and reason before submit.
- Destructive or irreversible accounting actions require confirmation.
- Daily close difference must be visually clear and not rely on color alone.

## Integration Points

- Checkout: paid cash orders create or expose source data for sales journal and cash ledger.
- Payments: cash payment amount is source for cash ledger.
- Reports: dashboard can link to accounting reports but must not duplicate accounting logic.
- Settings: store timezone/business date applies to daily close and reports.
- Users: admin actor is stored on manual accounting mutations.
- Activity logs: accounting mutations create audit records.

## Testing Requirements

Backend tests:

- Cash paid order generates one accounting entry or is idempotently represented.
- Journal entries must balance.
- Expense creation creates balanced journal lines.
- Cash in/out creates ledger and journal records.
- Duplicate daily close is rejected.
- Cashier cannot access accounting APIs.

Frontend tests:

- Accounting navigation is admin-only.
- Expense form validates required fields and amount.
- Daily close shows expected, counted, and difference amounts.
- Accounting tables handle empty and error states.

QA scenarios:

- Admin records expense and sees it in journal/report.
- Admin records cash out and sees cash ledger update.
- Admin closes day with exact counted cash.
- Admin closes day with cash difference and sees difference recorded.
- Cashier cannot open accounting pages or APIs.

## Acceptance Criteria

- [ ] Accounting is documented as MVP scope.
- [ ] Admin-only permissions are enforced in UI and API.
- [ ] Paid cash orders are represented in accounting without mutating order/payment records.
- [ ] Expenses and cash movements create auditable records.
- [ ] Journal entries balance.
- [ ] Daily close is unique per business date.
- [ ] Accounting reports use persisted accounting records and source references.
- [ ] Relevant tests and release validation commands pass.
