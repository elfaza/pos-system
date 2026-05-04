# 03 - PRD: Product Requirements

## Product Summary

The POS System is a cafe-focused MVP that combines cashier checkout, admin management, inventory, kitchen queue, and reporting in one web application.

## Personas

| Persona | Primary Jobs |
| --- | --- |
| Admin | Configure store, users, catalog, settings, inventory, reports |
| Cashier | Process orders, hold/resume carts, accept cash, print receipts, monitor queue |
| Kitchen operator | See paid orders and update preparation status |
| Owner | Review sales, stock, product, and cashier performance |

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
- Admin can manage product variants with price delta and active state.
- Cashier sees active categories and available products.

Acceptance criteria:

- Product grid updates after catalog changes.
- Variant price equals product price plus variant price delta.
- Historical orders retain product and variant snapshots.

### 4. Store Settings

Requirements:

- Admin can manage store name, address, phone, logo URL, tax, service charge, reserved refund policy fields, and receipt footer.
- Checkout uses current tax and service settings.

Acceptance criteria:

- Receipt shows configured store information.
- Checkout totals include enabled tax and service charge.

### 5. POS Checkout

Requirements:

- Cashier can search and filter products.
- Cashier can add product/variant items to cart.
- Cashier can update quantity, item notes, and item discounts.
- Cashier can hold and resume orders.
- Cashier can cancel eligible unpaid or held orders.
- Offline state blocks checkout mutations.

Acceptance criteria:

- Empty carts cannot be checked out.
- Held orders do not deduct stock.
- Server recalculates totals before payment.

### 6. Cash Payment

Requirements:

- Cashier enters cash received.
- System calculates change.
- Cash payment finalization creates a paid order and payment record.
- Payment status is server-authoritative.

Acceptance criteria:

- Cash received below total is rejected.
- Paid payment stores amount, cash received, change, and paid time.
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
- Admin can define product and variant recipes.
- Admin can adjust stock and record waste with reason.
- Checkout validates recipe stock before paid finalization.
- Stock movement history is available.

Acceptance criteria:

- Insufficient stock blocks paid checkout.
- Sale deduction creates stock movements.
- Adjustment and waste update stock in the same transaction as their movement records.

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
- Advanced analytics and accounting statements.
