# 03 - PRD: Product Requirements

## Product Summary

The POS System is a cafe-focused MVP that combines cashier checkout, admin management, inventory, kitchen queue, reporting, and operational accounting in one web application.

## Personas

| Persona | Primary Jobs |
| --- | --- |
| Admin | Configure store, users, catalog, settings, inventory, reports, and accounting |
| Cashier | Process orders, hold/resume carts, accept cash, print receipts, monitor queue |
| Kitchen operator | See paid orders and update preparation status |
| Owner | Review sales, stock, product, cashier performance, cash movement, expenses, and daily close records |

## Product Modules

### 1. Authentication

Requirements:

- Login and logout.
- Session validation through httpOnly cookie.
- Current-user endpoint and protected pages.
- Role-based routing for admin and cashier.
- Inactive user login rejection.

Acceptance criteria:

- Admin reaches dashboard after login.
- Cashier reaches POS after login.
- Cashier cannot access admin-only pages or APIs.

### 2. Admin User Management

Requirements:

- Admin can list users.
- Admin can create and update users.
- User records include name, email, role, active state, and login metadata.
- Passwords must be hashed.

Acceptance criteria:

- Admin can add an active cashier.
- Inactive users cannot authenticate.
- User responses never expose password hashes.

### 3. Catalog Management

Requirements:

- Admin can manage categories.
- Admin can manage products with category, SKU, image URL, description, price, cost price, availability, stock tracking, and threshold data.
- Admin can manage configurable product option groups and values, such as temperature, size, sugar level, and add-ons.
- Option values can affect price through a price delta.
- Option values can define extra ingredient deductions for add-ons that are added on top of the base product recipe.
- Option values can define replacement rules for substitutions that replace one base recipe ingredient with another ingredient.
- Cashier sees active categories and available products.

Acceptance criteria:

- Product grid updates after catalog changes.
- Required option groups block checkout until a value is selected.
- Product option price equals product base price plus selected option value deltas.
- Historical orders retain product and selected option snapshots.
- Product catalog changes do not mutate historical receipts.

### 4. Store Settings

Requirements:

- Admin can manage store name, address, phone, logo URL, tax, service charge, reserved refund policy fields, and receipt footer.
- Checkout uses current tax and service settings.

Acceptance criteria:

- Receipt shows configured store information.
- Checkout totals include enabled tax and service charge.

### 5. POS Checkout

Requirements:

- Cashier must choose order type (`dine_in`, `takeaway`, or `delivery`) before adding products.
- Cashier can search and filter products.
- Cashier can add products with selected option values to cart.
- Cashier can update quantity, item notes, and item discounts.
- Cashier can hold and resume orders.
- Dine-in orders can include a table reference.
- Dine-in pay-later/open-order behavior is controlled by store setting.
- Delivery orders can include customer name, customer phone, address, and delivery notes.
- Cashier can cancel eligible unpaid or held orders.
- Cashier can complete checkout with cash or manual QRIS.
- Manual QRIS is cashier-confirmed and immediately paid; there is no provider callback or settlement workflow.
- Offline state blocks checkout mutations.

Acceptance criteria:

- Empty carts cannot be checked out.
- Dine-in pay-later disabled means dine-in carts must be paid immediately.
- Held/open orders preserve order type, table, delivery metadata, items, and selected options when resumed.
- QRIS orders have payment method `qris` and no cash received/change amounts.
- Held orders do not deduct stock.
- Server recalculates totals before payment.

### 6. Payment

Requirements:

- Cashier chooses cash or manual QRIS when the method is enabled in settings.
- For cash, cashier enters cash received.
- System calculates change.
- Payment finalization creates a paid order and payment record.
- Payment status is server-authoritative.

Acceptance criteria:

- Cash received below total is rejected.
- Paid payment stores amount, cash received, change, and paid time.
- Paid QRIS payment stores method and amount without cash received or change.
- One order has one payment in the MVP.

Current limitation:

- Refund schema, settings, statuses, and report handling exist, but there is no active refund processing UI/API workflow in the current implementation.

### 7. Receipt

Requirements:

- Receipt shows store data, order number, queue number, paid date, cashier, payment method, order items, notes, discounts, totals, cash received, and change.
- Cashier can print after payment.
- Cashier can reprint from order history.

Acceptance criteria:

- Receipts remain printable after catalog names or prices change.
- Receipt layout handles long item names and notes.
- Reprint does not mutate order or payment state.

### 8. Inventory

Requirements:

- Admin can manage ingredients.
- Admin can define base product recipes.
- Admin can define option value extra ingredient recipes.
- Admin can define option value replacement rules.
- Admin can adjust stock and record waste with reason.
- Checkout validates recipe stock before paid finalization.
- Stock movement history is available.

Behavior:

- Base product recipe is the default stock deduction for one product unit.
- Extra ingredient recipes add more stock deduction on top of the base product recipe.
- Replacement rules remove one base recipe ingredient from deduction and deduct a replacement ingredient instead.
- Example: if `Cafe Latte` uses `Fresh Milk 180 ml`, selecting `Oat Milk` should replace `Fresh Milk 180 ml` with `Oat Milk 180 ml`.
- Example: selecting `Extra Shot` should add more `Espresso Beans` on top of the base recipe.

Acceptance criteria:

- Insufficient stock blocks paid checkout.
- Sale deduction creates stock movements.
- Adjustment and waste update stock in the same transaction as their movement records.
- Option extra ingredients and replacement ingredients are included in checkout stock validation and sale deduction.

### 9. Queue And Kitchen

Requirements:

- Paid checkout assigns daily queue number.
- Paid order starts kitchen status as `received`.
- Kitchen screen lists active paid orders.
- Staff can update kitchen status to `preparing`, `ready`, and `completed`.
- Queue display highlights waiting, preparing, and ready orders.

Acceptance criteria:

- Queue number is unique for the business date.
- Invalid backward kitchen transitions are rejected.
- Completed kitchen orders leave active queue views.

### 10. Dashboard And Reports

Requirements:

- Admin dashboard shows selected business date/range.
- Reports include sales summary, payment summary, top products, stock health, and cashier performance.
- Report APIs are admin-only.

Acceptance criteria:

- Paid orders are included in sales.
- Draft, held, cancelled unpaid, and failed orders are excluded.
- Cashier access to reports is forbidden.

### 11. Accounting

Requirements:

- Admin can manage chart of accounts.
- Admin can view journal entries generated from POS activity and manual accounting workflows.
- Admin can record expenses with category, amount, date, payment source, and description.
- Admin can record cash in and cash out movements with amount, date, and reason.
- Admin can close a business date by comparing expected cash and counted cash.
- Accounting reports include cash ledger, income/expense summary, journal history, and daily close history.
- Cashier cannot access accounting pages or APIs.

Acceptance criteria:

- Paid cash orders are represented in accounting without mutating order/payment records.
- Journal entries balance.
- Expenses and cash movements are auditable.
- Daily close is unique per business date.
- Accounting reports use persisted accounting records and POS source references.

Detailed module spec: [modules/accounting.md](modules/accounting.md).

## Out Of Scope

- Multi-store and branch management.
- Offline sync.
- QRIS/Midtrans active integration.
- Split payments and partial payments.
- Active refund processing workflow.
- Partial refunds.
- Customer loyalty.
- Table management.
- Hardware integrations.
- Native mobile apps.
- Advanced analytics.
- Tax filing, payroll, bank reconciliation, and audited accounting-grade financial statements.
