# POS System Design Guidelines

## Focus

Create a simple, fast, responsive POS interface for a small café. The UI should feel operational, clean, and touch-friendly. Use a restrained blue, white, and blue-gray palette for a reliable business-tool feel. Avoid decorative complexity. Prioritize cashier speed, readable totals, obvious actions, and predictable admin workflows.

This design guide assumes the app uses Tailwind CSS.

---

## Design Principles

- Design and review every screen as a senior UI/UX product designer would for a production system used daily by thousands of users.
- Optimize for repeat use, speed, clarity, and error prevention over novelty or decoration.
- Every visible element should have a clear operational purpose. Remove or simplify anything that does not help a cashier or admin complete work faster and with fewer mistakes.
- Keep the cashier workflow visible at all times: product selection, cart, totals, and payment action.
- Use large click/touch targets for POS actions.
- Treat tablet landscape as the primary POS hardware target for cafés. The cashier cart, totals, Hold, and Pay actions must remain visible on tablet landscape widths.
- Phone layouts are a fallback for monitoring or occasional checkout, not the main cashier layout.
- Make primary actions obvious and consistent.
- Use dense but readable admin pages.
- Prefer tables for management data and cards/buttons for product selection.
- Avoid hiding critical actions inside menus on desktop.
- Do not allow checkout actions when offline.
- Show loading, empty, error, and disabled states for every major workflow.

## Product Quality Bar

Before considering a screen complete, evaluate it as if it will be used for hundreds of transactions per day:

- Can the primary task be completed quickly without reading instructions?
- Are primary, secondary, and destructive actions visually distinct?
- Can users tell when an action was clicked, saved, failed, disabled, or still loading?
- Are dense screens scannable under pressure?
- Are errors written in plain operational language with a clear next step?
- Does the layout still work when names, prices, order numbers, and totals are longer than expected?
- Are keyboard focus, touch targets, contrast, and responsive behavior production-ready?
- Does the UI prevent costly mistakes, especially around payment, stock, cancellation, refund, and user access?
- Does the screen feel consistent with the rest of the product rather than like a one-off page?

---

## Tailwind Setup

Use Tailwind utility classes for layout and component styling. Keep shared colors, spacing, and radius values as CSS variables in the global stylesheet, then reference them through Tailwind-compatible classes.

### Suggested Tokens

```css
:root {
  --background: #eef2f7;
  --foreground: #162033;
  --muted: #e4eaf2;
  --muted-foreground: #58667d;
  --border: #c4cedb;
  --card: #ffffff;
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --primary-foreground: #ffffff;
  --danger: #dc2626;
  --danger-foreground: #ffffff;
  --warning: #d97706;
  --success: #16a34a;
  --info: #0284c7;
}
```

### Palette Usage

- Use blue for primary actions, active navigation, selected category tabs, and focused states.
- Use white for cart panels, tables, modals, forms, and product cards.
- Use a slightly darker blue-gray for page backgrounds so cards and panels do not blend into the page.
- Use white for individual cards, rows, inputs, modals, and table surfaces.
- Use light tinted panels such as `bg-slate-50` for secondary operational zones like the cart sidebar.
- Use green only for paid/success states.
- Use orange only for pending, warning, and low stock states.
- Use red only for errors, cancellation, refunds, and destructive actions.
- Avoid using blue for every surface; keep most surfaces neutral so primary actions remain obvious.
- Avoid pure white-on-near-white page compositions. Every card/list should be distinguishable through background contrast, border strength, or a very subtle shadow.

### Surface Hierarchy

Use a clear hierarchy so cashiers can distinguish product cards, cart items, and action areas quickly:

- App background: `bg-[var(--background)]`.
- Top app bars: white with bottom border and a subtle shadow such as `shadow-[0_1px_3px_rgba(15,23,42,0.08)]`.
- Primary content cards: white, `border border-[var(--border)]`, and a subtle shadow such as `shadow-[0_1px_2px_rgba(15,23,42,0.08)]`.
- Secondary panels: tinted neutral surface such as `bg-slate-50`, with a separating border and subtle directional shadow when adjacent to the main workspace.
- Empty states: white or transparent dashed panels with enough border contrast to be visible.
- Inputs: white with `border-[var(--border)]`; avoid inputs disappearing into white cards by keeping borders visible.

Rules:
- Prefer stronger neutral separation over decorative color.
- Use shadows only for hierarchy, not decoration.
- Shadows should be subtle and consistent; avoid large soft marketing-style shadows.
- Product cards and cart item cards must be distinguishable from the page and from each other at a glance.

### Tailwind Usage Rules

- Use `max-w-*` only for admin/content pages, not the cashier POS shell.
- Use `grid`, `flex`, `sticky`, and `overflow-*` for the POS layout.
- Use `sm`, `md`, `lg`, and `xl` breakpoints consistently. For cashier POS, `md` should generally be the first tablet split-layout breakpoint, not `lg`.
- Use `rounded-md` or smaller for operational UI.
- Use subtle shadows sparingly with stronger borders; borders should still carry most layout separation.
- Use `text-sm` and `text-base` for dense admin screens.
- Use `text-lg` and `text-xl` only for totals, modal titles, and key POS states.
- Use `hover:bg-[var(--muted)]` for neutral hover states.
- Use `focus-visible:ring-2 focus-visible:ring-[var(--primary)]` for keyboard focus.

---

## Core Layouts

### Cashier POS Tablet And Desktop

Target: tablet landscape, laptop, and desktop. This is the primary cashier layout.

```text
┌──────────────────────────────────────────────────────────────┐
│ Top bar: store, cashier, connection, history, logout          │
├──────────────────────────────────────┬───────────────────────┤
│ Search + category tabs               │ Cart                  │
│ Product grid                         │ Items                 │
│                                      │ Notes                 │
│                                      │ Totals                │
│                                      │ Hold / Pay            │
└──────────────────────────────────────┴───────────────────────┘
```

Tailwind layout:
- Shell: `h-dvh grid grid-rows-[auto_1fr] bg-[var(--background)] text-[var(--foreground)]`
- Main: `grid min-h-0 md:grid-cols-[minmax(0,1fr)_340px] lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_400px]`
- Product area: `min-w-0 overflow-y-auto p-4`
- Product grid: `grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4`
- Cart panel: `hidden border-l bg-[var(--card)] p-4 overflow-y-auto md:block`

Rules:
- Do not hide the cart behind a bottom bar on tablet landscape.
- The cart must show current items, totals, Hold, and Pay without requiring a drawer on tablet landscape.
- If horizontal space is tight, reduce product grid columns before hiding the cart.
- Top-bar actions may wrap or use shorter labels on tablet, but checkout actions must remain visible in the cart.

### Cashier POS Mobile

Target: phone and narrow tablet portrait below the `md` breakpoint.

```text
┌────────────────────────┐
│ Top bar                │
├────────────────────────┤
│ Search                 │
│ Category scroll        │
│ Product grid/list      │
├────────────────────────┤
│ Sticky cart summary    │
│ View Cart / Pay        │
└────────────────────────┘
```

Rules:
- Product grid becomes 2 columns on mobile.
- Cart becomes a bottom sheet or full-screen drawer.
- Payment opens as a full-screen or bottom-sheet modal.
- Sticky bottom summary must show item count, total, and direct Hold/Pay actions.
- The mobile bottom summary is only for widths below the tablet split layout.
- Mobile controls must fit without horizontal scrolling at 360px width.

Tailwind layout:
- Product grid: `grid grid-cols-2 gap-3`
- Mobile cart CTA: `fixed inset-x-0 bottom-0 border-t bg-[var(--card)] p-3 md:hidden`
- Tablet/desktop cart: `hidden md:block`

### Responsive QA Checklist

Check the cashier POS at these widths before considering a layout done:

- `360px`: no text overlap, product grid is usable, sticky bottom shows item count, total, Hold, and Pay.
- `768px`: product grid and full cart are both visible; cart items, totals, Hold, and Pay are reachable without opening a drawer.
- `820px`: tablet landscape still shows cart and Pay button.
- `1024px`: cart is stable, product cards do not compress awkwardly, top bar actions remain usable.
- `1280px`: product grid can expand, but the cart remains a fixed operational panel.

### Admin Layout

```text
┌──────────────────────────────────────────────┐
│ Top bar                                      │
├──────────────┬───────────────────────────────┤
│ Sidebar      │ Page content                  │
│ Navigation   │ Toolbar + table/form          │
└──────────────┴───────────────────────────────┘
```

Rules:
- Desktop uses sidebar navigation.
- Mobile uses top navigation or drawer.
- Management pages use table-first layouts.
- Forms should open in modal/drawer for quick edits when possible.

Tailwind layout:
- Shell: `min-h-dvh bg-[var(--background)]`
- Desktop body: `grid grid-cols-[240px_1fr]`
- Content: `min-w-0 p-4 lg:p-6`
- Panel: `rounded-md border bg-[var(--card)]`

---

## Screen Inventory

### Core Screens

| Screen | Role | Purpose |
| --- | --- | --- |
| Login | Admin, Cashier | Authenticate user |
| Cashier POS | Cashier | Product selection, cart, checkout |
| Payment Modal | Cashier | Cash payment and change calculation |
| Held Orders | Cashier | Resume held orders |
| Receipt Preview | Cashier | Print/reprint receipt |
| Order History | Admin, Cashier | View completed transactions |
| Admin Products | Admin | Manage products |
| Admin Categories | Admin | Manage categories |
| Admin Settings | Admin | Store, tax, service, receipt settings |
| Admin Users | Admin | Manage admin/cashier users |
| Inventory Adjustment | Stock adjustment and waste tracking |
| Kitchen Display | Preparation workflow |
| Queue Display | Customer-facing queue |
| Reports | Sales and inventory reporting |
| Accounting | Cash ledger, expenses, journals, and daily close |

### Deferred Screens

| Screen | Purpose |
| --- | --- |
| QRIS Payment | Midtrans QRIS creation/status |
| Refund Management | Admin refund workflow |

---

## Cashier POS UX

### Product Selection

- Search input is always visible.
- Category tabs are horizontally scrollable on small screens.
- Product cards show name, price, availability, and optional image.
- Unavailable products are visible but disabled, or hidden through a filter.
- Variant selection appears after product click if variants exist.

Recommended product card:
- `button`
- `rounded-md border bg-[var(--card)] p-3 text-left`
- Product name: `font-medium leading-tight`
- Price: `mt-2 text-sm text-[var(--muted-foreground)]`
- Disabled state: `opacity-50 cursor-not-allowed`

### Cart

- Cart must show item name, variant, note, quantity, unit price, and line total.
- Quantity controls should use minus/plus buttons.
- Item note edit should be quick, preferably inline or small modal.
- Totals must stay visible near the payment button.
- Empty cart should show a simple empty state and disabled payment button.

Cart totals order:
- Subtotal
- Discount
- Service charge
- Tax
- Total

### Payment

- Cash payment modal should show total prominently.
- Cash received input should auto-focus.
- Provide quick amount buttons based on common rounded amounts.
- Change should update immediately.
- Disable submit if received amount is less than total.
- After payment success, show receipt preview/print action.

Payment modal layout:

```text
┌──────────────────────────────┐
│ Cash Payment                 │
│ Total: Rp 85.000             │
│ Cash received input          │
│ Quick amount buttons         │
│ Change: Rp 15.000            │
│ Cancel        Confirm Payment│
└──────────────────────────────┘
```

### Hold / Resume

- Hold is secondary to Pay.
- Held orders list shows order number, time, cashier, item count, and total.
- Resuming a held order replaces or merges with current cart only after confirmation.
- Held orders do not deduct stock.

### Offline State

- Show persistent top banner when connection is lost.
- Disable hold, pay, refund, and complete actions.
- Keep current cart visible, but block final actions.
- Show reconnect state before allowing checkout.

Suggested text:
- `Connection lost. Checkout actions are disabled until the POS reconnects.`

---

## Admin UX

### Products

- Use a searchable table on desktop.
- Use stacked rows/cards on mobile.
- Primary action: Add Product.
- Row actions: Edit, Disable, View.
- Avoid destructive delete for MVP; prefer inactive/unavailable state.

Columns:
- Image
- Name
- Category
- SKU
- Price
- Stock
- Available
- Actions

### Categories

- Simple table/list with drag/sort later.
- MVP supports name, slug, sort order, active state.

### Settings

Group settings into clear sections:
- Store profile
- Tax
- Service charge
- Receipt
- Refund policy

Use toggles for enabled/disabled settings and numeric inputs for rates.

### Users

- Table of users with name, email, role, status, last login.
- Admin can create, edit, activate, and deactivate users.
- Password reset can be simple for MVP.

---

## Responsive Rules

| Viewport | Behavior |
| --- | --- |
| `< 640px` | Mobile POS, product grid 2 columns, cart as bottom sheet |
| `640px - 1023px` | Tablet layout, product grid 3 columns, cart drawer or side panel |
| `>= 1024px` | Desktop layout, product grid plus persistent right cart |
| `>= 1280px` | Wider product grid, fixed cart width around 380-420px |

Rules:
- No horizontal page scrolling.
- Tables must become responsive with horizontal scroll or mobile row cards.
- Buttons must remain at least `44px` tall on touch screens.
- Sticky payment/total actions should remain visible on POS screens.

---

## Component Patterns

### Buttons

- Primary: payment, save, confirm.
- Secondary: hold, cancel, back.
- Danger: refund, deactivate, destructive actions.
- Icon buttons should have accessible labels.

Tailwind examples:

```text
Primary: h-11 rounded-md bg-[var(--primary)] px-4 font-medium text-[var(--primary-foreground)]
Secondary: h-11 rounded-md border bg-[var(--card)] px-4 font-medium
Danger: h-11 rounded-md bg-[var(--danger)] px-4 font-medium text-[var(--danger-foreground)]
```

### Forms

- Labels above inputs.
- Use helper text for business rules.
- Validate on submit and show field-level errors.
- Required fields should be obvious.

### Tables

- Use compact rows, readable spacing, and sticky headers only when useful.
- Admin tables should have search and filters above the table.
- Empty table states should provide the next action.

### Modals & Drawers

- Use modals for confirmation and focused payment flows.
- Use drawers for edit forms and mobile cart.
- Payment modal should be hard to submit accidentally.

---

## States

### Loading

- Use skeleton rows/cards for product grid and tables.
- Disable repeated submit while mutation is pending.

### Empty

- Product grid: show no products found and a reset filter action.
- Cart: show cart is empty and keep payment disabled.
- Order history: show no transactions yet.

### Error

- Show field-level validation near the field.
- Show API errors in a visible alert near the action area.
- Keep user input when submission fails.

### Success

- Show payment success state with print/reprint receipt action.
- Avoid long success messages that slow cashier flow.

---

## Accessibility

- Use semantic buttons for clickable actions.
- Use labels for all inputs.
- Maintain visible focus states.
- Color must not be the only status indicator.
- Dialogs must trap focus and close with `Escape` where appropriate.
- Totals and payment status should be readable by screen readers.

---

## Implementation Notes

- Use Tailwind utilities directly for most component styling.
- Extract reusable components only after a pattern repeats.
- Keep POS state local with Zustand for cart and active UI state.
- Use TanStack Query for server data: products, categories, orders, settings.
- Keep calculation logic in shared service functions so UI and API stay consistent.
- Store historical snapshots in order items and receipts so old transactions do not change when products are edited.
