# 🚀 Milestone 3: Payment System (2 Weeks)

## 🎯 Focus

Complete the cash payment flow for the café POS so cashiers can accept cash payments, the system can track payment records accurately, and customers can receive printable receipts after successful payment.

---

## 🧭 Scope Rules

- MVP remains single-store only.
- MVP remains online-only. Cash checkout, payment record persistence, and receipt printing require active internet.
- Roles remain limited to `admin` and `cashier`.
- Cashier can accept cash payments from the POS.
- Admin can view payment history and payment details.
- One order uses one payment method only.
- Split payment and partial payment are excluded from this milestone.
- Server-side payment status is the source of truth.
- Stock deduction happens only after payment is successfully confirmed.
- Held orders do not create payment records unless payment is explicitly started after resume.
- QRIS integration is deferred until after the core project is finished.

---

## 🧱 WBS 3.0: Payment System

---

### 3.1 💵 Cash Payment

- **3.1.1 Cash Payment Modal**
  - Cashier can open payment from a non-empty cart.
  - Modal shows order total prominently.
  - Cashier enters cash received amount.
  - System calculates change immediately.
  - Payment confirm is disabled when cash received is below total.

- **3.1.2 Cash Payment Finalization**
  - Server recalculates totals from authoritative product and settings data.
  - Server validates stock availability before marking payment as paid.
  - Create exactly one `cash` payment record for the order.
  - Mark payment as `paid`.
  - Mark order as `paid`.
  - Store `cash_received_amount`, `change_amount`, and `paid_at`.
  - Deduct stock after payment confirmation.

- **3.1.3 Cash Payment Errors**
  - Reject empty carts.
  - Reject unavailable products.
  - Reject insufficient cash received.
  - Reject insufficient stock before payment is saved.
  - Return cashier-safe messages for validation failures.

---

### 3.2 🧾 Payment Records

- **3.2.1 Payment Persistence**
  - Every completed cash payment creates a payment record.
  - Payment records store method, status, amount, paid time, and cash-specific fields.
  - Payment amount must match the order total for MVP.

- **3.2.2 Payment History**
  - Cashier can view payment status in order history.
  - Cashier can identify paid cash payments.
  - Admin can view all order/payment history.
  - Admin can filter payment history by method, status, and date range if an admin payment history screen is included in the implementation.

- **3.2.3 Payment Audit Rules**
  - Payment status transitions must be logged.
  - Manual status correction is out of scope unless explicitly added later.
  - Payment records must not be deleted after orders are paid.

---

### 3.3 🖨️ Printable Receipt

- **3.3.1 Receipt Content**
  - Receipt shows store name, address, phone, and footer from settings.
  - Receipt shows receipt/order number, paid date, cashier name, and payment method.
  - Receipt shows order items, quantities, notes, unit prices, discounts, and line totals.
  - Receipt shows subtotal, discount, tax, service charge, total, paid amount, and cash change.

- **3.3.2 Receipt Print Flow**
  - After successful payment, cashier sees a payment success state with print action.
  - Cashier can print receipt immediately after payment.
  - Cashier can reprint receipt from order history.
  - Receipt printing uses persisted order, item, payment, and settings snapshots where available.

- **3.3.3 Receipt Reliability**
  - Receipts for paid orders must remain printable even if product names or prices change later.
  - Print layout must fit common receipt widths.
  - Receipt preview must handle long product names and notes without overlapping text.
  - Reprint should not mutate payment or order state.

---

### 3.4 🧩 Deferred QRIS Preparation

- Keep existing `qris`, provider reference, and expiry-capable payment schema fields if already present.
- Do not build Midtrans integration in this milestone.
- Do not add QRIS UI, QRIS webhook endpoints, QRIS status polling, or QRIS provider configuration in this milestone.
- Treat QRIS as a future milestone after the core project is finished.

---

### 3.5 🗄️ Database Tables

Milestone 1 already prepared the core order and payment tables. Milestone 3 validates and completes their cash payment behavior.

#### Changed `payments`

Purpose: records cash payment attempts and confirmed payment state.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `method` | Enum | Yes | `cash` for this milestone; `qris` remains reserved for later |
| `status` | Enum | Yes | `pending`, `paid`, `failed`, `expired`, `refunded` |
| `amount` | Decimal | Yes | Must match order total in MVP |
| `cash_received_amount` | Decimal | Yes | Cash tendered by customer |
| `change_amount` | Decimal | Yes | Cash change returned |
| `provider` | String | No | Reserved for QRIS later |
| `provider_reference` | String | No | Reserved for QRIS later |
| `paid_at` | DateTime | Paid only | Set only after confirmation |
| `expires_at` | DateTime | No | Reserved for QRIS later |

Rules:
- One order has one payment in MVP.
- `cash_received_amount` and `change_amount` are required for paid cash payments.
- Provider fields are not used by active Milestone 3 workflows.
- `paid_at` is set only when status becomes `paid`.
- Duplicate paid transitions must not create duplicate stock deductions.

---

### 3.6 🔐 Roles & Permissions

| Workflow | Admin | Cashier | Notes |
| --- | --- | --- | --- |
| Accept cash payment | Yes | Yes | Cashier uses POS; admin may perform when using POS |
| View own cashier order/payment history | Yes | Yes | Cashier scope may be limited to operational history |
| View all payment history | Yes | No | Admin-only |
| Print/reprint paid receipt | Yes | Yes | Cashier can reprint operational receipts |

Rules:
- API authorization must enforce the same permissions as UI navigation.
- Cashier must not access admin-only payment reports.

---

### 3.7 🧮 Money And Calculation Rules

- Server recalculates subtotal, discount, tax, service charge, and total before payment finalization.
- Payment amount must equal the final order total.
- Cash received amount must be greater than or equal to total.
- Change amount = cash received amount - total.
- Money values must use existing currency/number helpers and decimal-safe handling.
- Stock deduction must run after payment confirmation and must happen exactly once.
- Order item snapshots remain the source for receipt totals and historical display.

---

### 3.8 🌐 Offline & Connectivity Rules

- Cash payment cannot be completed while offline.
- Receipt printing and reprinting require current order/payment data from the server.
- Previously loaded order/payment data may remain visible while offline, but mutation actions are blocked.

---

### 3.9 🧪 Testing Requirements

- **3.9.1 Cash Payment Tests**
  - Cash payment succeeds with cash received greater than total.
  - Cash payment succeeds with exact cash received.
  - Cash payment rejects cash received below total.
  - Cash payment creates one paid payment record.
  - Cash payment marks order as paid.
  - Cash payment deducts stock after confirmation.

- **3.9.2 Payment Record Tests**
  - Payment amount matches order total.
  - One order cannot create multiple active payments in MVP.
  - Payment status transitions are persisted.
  - Payment history exposes method, status, amount, and paid time.
  - Cashier cannot access admin-only all-payment history.

- **3.9.3 Receipt Tests**
  - Paid cash order receipt shows cash received and change.
  - Receipt uses item snapshots after product data changes.
  - Reprint does not mutate order or payment state.
  - Receipt preview handles long names and notes.

- **3.9.4 Frontend Workflow Tests**
  - Payment modal loading, validation, submitting, error, and success states.
  - Receipt preview and print action after payment success.
  - Offline disabled state for cash payment actions.

---

## ✅ Milestone Output

After completing this milestone, the system will allow:

- Cashier to complete cash payments with change calculation.
- System to persist complete payment records for cash.
- Admin to view payment history across transactions.
- Cashier to view payment status in order history.
- Cashier to print and reprint receipts for paid orders.
- System to keep payment status server-authoritative and audit-friendly.

Goal: complete cash payment flow.

---

## 🚫 Explicitly Out of Scope for Milestone 3

- QRIS payment integration
- Midtrans provider integration
- QRIS webhook/callback handling
- QRIS status polling
- Split payment
- Partial payment
- Partial refund
- Manual payment status override
- Card payment
- E-wallet provider integrations
- Offline payment sync
- Customer loyalty
- Kitchen Display System
- Queue display
- Table management
- Advanced financial reports
