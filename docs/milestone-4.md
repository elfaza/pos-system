# 🚀 Milestone 4: Queue + Kitchen (2 Weeks)

## 🎯 Focus

Build the queue and kitchen workflow for the café POS so paid orders receive clear pickup numbers, kitchen staff can prepare orders in sequence, cashiers can track status updates, and customers can be notified when orders are ready.

---

## 🧭 Scope Rules

- MVP remains single-store only.
- MVP remains online-only. Queue assignment, kitchen updates, and ready notifications require active internet.
- Roles remain limited to `admin` and `cashier`.
- Paid orders enter the kitchen queue automatically.
- Held, cancelled, refunded, and unpaid orders do not appear in the kitchen queue.
- Queue numbers reset per business day.
- Kitchen status is separate from payment status.
- Server-side kitchen status is the source of truth.
- Notification in this milestone means an in-app ready state or display surface, not SMS, WhatsApp, email, or push notification.
- Kitchen Display System and queue display are operational screens, not advanced production analytics.

---

## 🧱 WBS 4.0: Queue + Kitchen

---

### 4.1 🔢 Queue Numbers

- **4.1.1 Queue Number Assignment**
  - Assign a queue number when an order is successfully paid.
  - Queue number is unique for the business date.
  - Queue number increments by payment completion order.
  - Queue number should be short and readable for customers.
  - Receipt and payment success state show the queue number.

- **4.1.2 Queue Number Display**
  - Order history shows queue number for paid orders.
  - POS payment success state shows queue number prominently.
  - Kitchen screen uses queue number as the primary visual identifier.
  - Queue display screen shows waiting, preparing, and ready numbers.

- **4.1.3 Queue Number Reliability**
  - Queue assignment must happen inside the same transaction as payment finalization where possible.
  - Failed checkout must not consume or expose a queue number.
  - Duplicate queue numbers for the same business date must be blocked.
  - Historical queue numbers must remain stable after product or order item changes.

---

### 4.2 🍳 Kitchen Orders

- **4.2.1 Kitchen Queue Creation**
  - A paid order automatically creates or activates a kitchen order state.
  - Initial kitchen status is `received`.
  - Kitchen orders include queue number, order number, paid time, cashier, notes, and item details.
  - Item details include product snapshot, variant snapshot, quantity, and item notes.

- **4.2.2 Kitchen Display Screen**
  - Admin and cashier can access the kitchen display.
  - Kitchen display groups orders by status.
  - Kitchen display prioritizes oldest received/preparing orders first.
  - Kitchen staff can inspect item notes without leaving the screen.
  - Screen supports loading, empty, error, and offline states.

- **4.2.3 Kitchen Order Detail**
  - Kitchen detail view shows all order items and notes.
  - Long product names and item notes must wrap without overlapping controls.
  - Kitchen detail must not show payment-sensitive cash details unless already shown elsewhere to that role.

---

### 4.3 🔄 Status Updates

- **4.3.1 Status Lifecycle**
  - Supported kitchen statuses:
    - `received`
    - `preparing`
    - `ready`
    - `completed`
  - Valid transitions:
    - `received` → `preparing`
    - `received` → `ready`
    - `preparing` → `ready`
    - `ready` → `completed`
  - Invalid backward transitions are blocked in MVP.
  - Cancelled or refunded orders must not accept kitchen status updates.

- **4.3.2 Status Update Actions**
  - Kitchen staff can mark an order as preparing.
  - Kitchen staff can mark an order as ready.
  - Cashier or kitchen staff can mark a ready order as completed after pickup.
  - Every status update stores the timestamp for that state.
  - Every status update creates an activity log entry.

- **4.3.3 Status Visibility**
  - POS and order history show kitchen status for paid orders.
  - Kitchen display refreshes automatically while online.
  - Queue display refreshes automatically while online.
  - UI must handle stale data by reloading after update failures.

---

### 4.4 🔔 Order Ready Notification

- **4.4.1 Ready State Notification**
  - When an order becomes `ready`, it appears in a dedicated ready section.
  - Queue display highlights ready queue numbers clearly.
  - Cashier view shows ready orders that need pickup/completion.
  - Ready notification uses persisted kitchen status, not client-only state.

- **4.4.2 Notification Behavior**
  - Ready orders remain visible until marked completed.
  - Completed orders leave active queue display.
  - Multiple ready orders can be shown at once.
  - Ready status must survive page refresh.

- **4.4.3 Deferred Notification Channels**
  - SMS notifications are out of scope.
  - WhatsApp notifications are out of scope.
  - Email notifications are out of scope.
  - Browser push notifications are out of scope.
  - Customer-facing external display hardware integration is out of scope.

---

### 4.5 🗄️ Database Tables

Milestone 4 can extend the existing `orders` table or introduce a dedicated kitchen/queue table. The implementation should choose the simpler approach that preserves clear status ownership and auditability.

#### Changed `orders`

Purpose: stores queue identity and kitchen lifecycle for paid orders.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `queue_business_date` | String/Date | Paid orders | Business date used for daily queue reset |
| `queue_number` | Integer | Paid orders | Customer-facing queue number |
| `kitchen_status` | Enum | Paid kitchen orders | `received`, `preparing`, `ready`, `completed` |
| `kitchen_preparing_at` | DateTime | No | Set when first marked preparing |
| `kitchen_ready_at` | DateTime | No | Set when first marked ready |
| `kitchen_completed_at` | DateTime | No | Set when marked completed |

Rules:
- `(queue_business_date, queue_number)` must be unique.
- Paid orders should have queue number and kitchen status.
- Held, cancelled unpaid, and draft orders should not have active queue numbers.
- Queue number must not change after assignment.
- Kitchen status must not replace order payment/refund status.

#### Changed `activity_logs`

Purpose: records queue and kitchen lifecycle changes.

| Action | Entity | Metadata |
| --- | --- | --- |
| `queue.assigned` | `order` | order number, queue date, queue number |
| `kitchen.status_changed` | `order` | previous status, next status, queue number |

---

### 4.6 🔐 Roles & Permissions

| Workflow | Admin | Cashier | Notes |
| --- | --- | --- | --- |
| View kitchen display | Yes | Yes | Cashier can help kitchen operations in MVP |
| View queue display | Yes | Yes | Operational display screen |
| Assign queue number | System | System | Happens after paid checkout |
| Mark received/preparing/ready | Yes | Yes | Server-side authorization required |
| Mark completed/picked up | Yes | Yes | Usually cashier after customer pickup |
| View all active kitchen orders | Yes | Yes | Single-store MVP |
| Modify payment state from kitchen | No | No | Out of scope |

Rules:
- API authorization must enforce the same permissions as UI navigation.
- Kitchen endpoints must require authenticated users.
- Kitchen status updates must be server-validated.
- Client must not be allowed to submit arbitrary queue numbers.

---

### 4.7 🧮 Queue And Status Rules

- Queue number is assigned only after successful payment.
- Queue number sequence is scoped to the business date.
- Business date should use the store timezone.
- If two payments complete at the same time, the database must prevent duplicate queue numbers.
- Kitchen order sorting:
  - Active received/preparing orders sort by paid time ascending.
  - Ready orders sort by ready time ascending.
  - Completed orders are excluded from active kitchen view by default.
- Kitchen status timestamps are set once when the order first enters that state.
- Repeating the same status update should be idempotent or return a clear validation error.

---

### 4.8 🌐 Offline & Connectivity Rules

- Kitchen display can show previously loaded data while offline.
- Kitchen status mutation actions are disabled while offline.
- Queue display can show previously loaded data while offline.
- Automatic refresh pauses while offline and resumes after reconnect.
- Failed status updates must show a clear error and keep the previous visible state until reload.

---

### 4.9 🧪 Testing Requirements

- **4.9.1 Queue Number Tests**
  - Paid checkout assigns queue number.
  - Queue number is unique per business date.
  - Queue number increments for multiple paid orders.
  - Failed checkout does not assign queue number.
  - Receipt/payment success output includes queue number.

- **4.9.2 Kitchen Status Tests**
  - Paid order starts as `received`.
  - `received` can move to `preparing`.
  - `preparing` can move to `ready`.
  - `ready` can move to `completed`.
  - Invalid backward transitions are rejected.
  - Cancelled/refunded orders reject kitchen updates.
  - Status update creates activity log entry.

- **4.9.3 API Tests**
  - Active kitchen orders endpoint returns paid non-completed orders.
  - Ready queue endpoint returns ready orders only.
  - Unauthorized users cannot access kitchen endpoints.
  - Invalid status payload returns validation errors.

- **4.9.4 Frontend Workflow Tests**
  - Kitchen display loading, empty, error, offline, and populated states.
  - Kitchen cards show queue number, items, notes, and status actions.
  - Queue display highlights ready orders.
  - POS/order history reflects kitchen status after refresh.

---

## ✅ Milestone Output

After completing this milestone, the system will allow:

- Cashier to complete paid orders that receive queue numbers.
- Kitchen staff to view paid orders in a kitchen display.
- Kitchen staff to update orders through received, preparing, ready, and completed states.
- Cashier to see which orders are ready for pickup.
- Queue display to show waiting/preparing/ready queue numbers.
- Ready orders to remain visible until completed.

Goal: complete operational queue and kitchen workflow.

---

## 🚫 Explicitly Out of Scope for Milestone 4

- SMS notification
- WhatsApp notification
- Email notification
- Browser push notification
- Customer accounts
- Table management
- Dine-in table routing
- Multiple kitchen stations
- Prep-time analytics
- Staff performance reports
- Kitchen printer integration
- External customer display hardware integration
- Advanced order routing by product category
- Delivery order dispatch
- Multi-store queue coordination

---

## ✅ Acceptance Criteria

- [x] Paid checkout assigns a daily queue number.
- [x] Queue number appears on payment success, receipt, order history, kitchen display, and queue display.
- [x] Paid orders appear in kitchen display with initial `received` status.
- [x] Kitchen status can move through valid lifecycle states.
- [x] Invalid kitchen status transitions are blocked.
- [x] Ready orders appear in a clear ready notification/display area.
- [x] Completed orders leave active queue display.
- [x] Offline state disables queue and kitchen mutations.
- [x] Documentation compliance checked against `docs/pos-system-spec.md`.
- [x] Documentation compliance checked against this milestone file.
- [x] UI compliance checked against `docs/design-guidelines.md`.
- [x] Relevant tests and validation commands pass.
- [x] QA verifies the integrated result.

---

## 📝 Implementation Notes

- Suggested sequence:
  - Add queue/kitchen fields and migration.
  - Assign queue number during cash checkout transaction.
  - Add kitchen repository/service/API endpoints.
  - Add kitchen display page.
  - Add queue display page.
  - Surface queue/kitchen status in receipt and order history.
  - Add backend and UI workflow tests.
- Treat queue assignment as part of payment finalization, not as a client-side action.
- Keep kitchen status independent from payment status to avoid breaking existing payment history behavior.

---

## 📌 Completion Record

- Completed date: 2026-04-29
- Final validation commands: `npm run prisma:generate`, `npm test`, `npm run lint`, `npm run build`
- Known follow-ups: None.
- Release notes: Added daily queue numbers, kitchen display, queue display, kitchen status updates, ready pickup visibility, and queue/kitchen status surfaces in receipts and order history.
