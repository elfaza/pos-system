# 08 - UI/UX Specification

## Design Goal

The interface must feel like an operational cafe tool: fast, clear, touch-friendly, and reliable under daily transaction pressure. The design should avoid decorative complexity and prioritize scanning, checkout speed, clear totals, and safe destructive actions.

## Design Principles

- Cashier workflow must remain visible and fast.
- Primary actions must be obvious.
- Destructive actions require visual distinction and confirmation where needed.
- Admin pages should be dense but readable.
- Tables are preferred for management data.
- Product cards and buttons are preferred for cashier selection.
- Every major workflow needs loading, empty, error, disabled, and offline states.
- Long names, notes, money values, and order numbers must not overlap controls.

## Screen Inventory

| Screen | Role | Purpose |
| --- | --- | --- |
| Login | Admin, Cashier | Authenticate user |
| POS | Cashier, Admin | Product browsing, cart, held orders, checkout |
| Payment modal | Cashier, Admin | Enter cash received and confirm payment |
| Receipt preview | Cashier, Admin | Print or reprint paid receipt |
| Orders | Cashier, Admin | View operational order history |
| Kitchen | Cashier, Admin | Manage active paid order preparation |
| Queue | Cashier, Admin | Display waiting, preparing, and ready queue numbers |
| Dashboard | Admin | View business metrics and reports |
| Accounting Overview | Admin | View cash, income, expenses, journals, and close status |
| Accounting Accounts | Admin | Manage chart of accounts |
| Accounting Journal | Admin | Inspect generated and manual accounting entries |
| Accounting Expenses | Admin | Record and review operating expenses |
| Accounting Cash | Admin | Review cash ledger and record cash in/out |
| Accounting Daily Close | Admin | Count cash and close the business date |
| Users | Admin | Manage user accounts and active state |
| Categories | Admin | Manage catalog grouping |
| Products | Admin | Manage sellable products and variants |
| Inventory | Admin | Manage ingredients, stock, recipes, movements |
| Settings | Admin | Manage store, tax, service, reserved refund policy, and receipt settings |

## POS Layout

### Tablet And Desktop

Target: tablet landscape, laptop, and desktop.

```text
Top bar: store, cashier, connection, orders, logout
Main area:
  Left: search, category filters, product grid
  Right: cart, item controls, notes, totals, Hold, Pay
```

Rules:

- Cart must remain visible from tablet landscape widths upward.
- Product grid should reduce columns before hiding critical cart controls.
- Hold and Pay actions must stay reachable without scrolling on common tablet sizes where practical.
- Payment success should show order number, queue number, receipt action, and new order action clearly.

### Mobile

Target: narrow phone and portrait fallback.

```text
Top bar
Search
Category horizontal scroll
Product grid
Sticky cart summary with item count, total, Hold, Pay/View Cart
Cart drawer or full-screen sheet
```

Rules:

- No horizontal page scroll at 360px width.
- Product grid remains usable.
- Sticky bottom cart summary must not cover required content without scroll padding.
- Payment modal must fit on short screens and keep confirm action reachable.

## Admin Layout

Desktop:

- Sidebar navigation.
- Top-level content area.
- Toolbar for search/filter/create actions.
- Table-first management views.
- Modals or drawers for quick edits when appropriate.

Mobile:

- Navigation remains accessible.
- Tables use controlled horizontal scrolling or stacked detail views.
- Dialogs fit the viewport and remain dismissible.

## Kitchen Layout

Requirements:

- Orders are grouped or visually distinguished by status.
- Queue number is the primary identifier.
- Cards show order number, paid time, item summaries, notes, and next actions.
- Status actions use large touch targets.
- Ready orders are easy to identify without relying on color alone.
- Completed orders leave the active view.

## Queue Layout

Requirements:

- Queue numbers are readable from customer-facing distance.
- Waiting, preparing, and ready states are visually distinct.
- Ready queue numbers are prominent.
- Display refreshes while online and handles stale/offline states.

## Dashboard Layout

Requirements:

- Admin-only.
- Selected date or date range is visible.
- Summary cards show sales, payments, product, stock, and cashier metrics.
- Detail tables are scannable and use persisted values.
- Empty sales periods show empty state, not an error.

## Accounting Layout

Requirements:

- Admin-only.
- Use table-first layouts for accounts, journals, expenses, cash movements, and daily close history.
- Forms must validate amount, date, account/category, payment source, and reason before submit.
- Daily close shows expected cash, counted cash, and difference clearly.
- Difference and warning states must not rely on color alone.
- Accounting mutation actions are disabled while offline.
- Accounting screens must not expose data or navigation to cashier users.

## Interaction States

| State | Requirement |
| --- | --- |
| Loading | Show skeleton, spinner, or stable loading content without layout collapse |
| Empty | Explain the absence of data in operational terms |
| Error | Show safe message and retry path where applicable |
| Disabled | Make unavailable actions visibly disabled and explain important blockers |
| Offline | Disable mutation actions and preserve previously loaded data as stale |
| Success | Confirm action result and show next operational action |

## Touch Targets

- Product cards, cart quantity controls, category filters, Hold, Pay, payment confirm, kitchen status, and queue actions must be comfortable on touchscreens.
- Avoid tiny adjacent destructive controls.
- Loading state should not shrink buttons or shift layout.

## Content Resilience

The UI must handle long:

- Store names.
- Product names.
- Variant names.
- Category names.
- Cashier names.
- Order numbers.
- Queue numbers.
- Item notes.
- Receipt footer text.

Rules:

- Wrap or truncate intentionally.
- Never overlap controls.
- Money and status labels must remain readable.
- Tables may scroll horizontally when the table format is the clearest presentation.

## Visual Standards

Follow [design-guidelines.md](design-guidelines.md).

Core direction:

- Operational, clean, restrained.
- Neutral surfaces with clear borders.
- Blue for primary actions.
- Red only for destructive, error, refund-status, and future refund action states.
- Orange for pending/warning/low stock.
- Green for paid/success states.
- Avoid decorative layouts, oversized marketing sections, and unnecessary animation.
