# Release QA Checklist

Use seeded demo accounts unless the target environment provides dedicated test users.

## Validation Commands

- [ ] `npm run prisma:generate`
- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run build`

## Viewport Checks

Check POS and key operational screens at these widths:

- [ ] `360px`: no horizontal page scroll, product grid is usable, bottom cart summary shows item count, total, Hold, and Pay.
- [ ] `768px`: POS product grid and cart are both visible.
- [ ] `820px`: tablet landscape keeps cart totals, Hold, and Pay reachable.
- [ ] `1024px`: top bar actions remain usable and product cards do not collapse.
- [ ] `1280px`: product grid expands while cart remains fixed and readable.

## Touchscreen Workflow

- [ ] Product cards, category filters, quantity controls, Hold, Pay, kitchen status, and queue actions are at least practical touch size.
- [ ] Cashier can add products, adjust quantity, hold an order, resume it, and complete cash checkout without layout shifts.
- [ ] Cash payment modal remains scrollable on short screens and the Confirm Payment button is reachable.
- [ ] Payment success shows order number, queue number, receipt preview, and New order action clearly.

## Responsive And Content Resilience

- [ ] Long store, product, category, variant, cashier, order, queue, and note text does not overlap controls.
- [ ] Admin tables use controlled horizontal scrolling on narrow screens.
- [ ] Queue display remains readable from customer-facing distance.
- [ ] Kitchen cards wrap long product names and notes.

## Online-Only Guards

- [ ] POS offline banner appears when the browser is offline.
- [ ] Hold and Pay are disabled while offline.
- [ ] Kitchen status changes are disabled while offline.
- [ ] Queue, order history, and dashboard refresh after reconnect.

## Role And Permission Checks

- [ ] Admin can access dashboard, reports, accounting, catalog, inventory, users, settings, orders, kitchen, and queue.
- [ ] Cashier can access POS, orders, kitchen, and queue.
- [ ] Cashier cannot access admin dashboard, reports, accounting, catalog management, inventory management, users, or settings.
- [ ] Authenticated cashier opening `/` is routed to POS, not an admin-only surface.

## Critical Business Flows

- [ ] Paid cash checkout deducts tracked stock.
- [ ] Held order does not deduct stock until paid.
- [ ] Cancelled unpaid or held order does not deduct stock.
- [ ] Paid order receives a daily queue number and initial kitchen status.
- [ ] Kitchen order can move through received, preparing, ready, and completed.
- [ ] Dashboard totals load for admin and remain blocked for cashier.
- [ ] Paid cash order is represented once in accounting.
- [ ] Admin can record expense, cash movement, and daily close.
- [ ] Accounting journal entries balance.

## States

- [ ] Loading states are visible for catalog, orders, kitchen, queue, dashboard, and admin tables.
- [ ] Empty states are clear for no products, empty cart, no held orders, no orders, no kitchen orders, and no queue numbers.
- [ ] Error states preserve user input where applicable.
- [ ] Disabled states explain unavailable checkout or mutation actions where operationally important.
