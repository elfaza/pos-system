# Milestone 1 Implementation Result

Date: 2026-04-27

## Scope

Milestone 1 targets the online-only, single-store POS foundation: authentication, product setup, cashier checkout, cash payment, held orders, order persistence, stock deduction after payment, and extension-ready database tables.

## Implemented

- Local PostgreSQL and Prisma foundation with schema, migration, seed data, and environment setup.
- Admin and cashier authentication with active-user checks, sessions, logout, role guards, and protected API/page access.
- Admin dashboard shell with category, product, and settings management screens backed by Route Handlers, services, repositories, and Prisma.
- Cashier POS product search, category filtering, variant selection, cart quantity controls, item notes, totals, offline blocking, and cash payment.
- Server-side cash checkout that calculates tax and service charge from settings, records order/payment snapshots, deducts tracked stock after payment, and logs activity.
- Held-order API and cashier UI for holding a cart and resuming a held order.
- Order cancellation API and UI actions for unpaid orders, including held orders.
- Order history API and screen for admin and cashier users.
- Receipt preview, print, and reprint access after payment and from order history.
- Admin users API and screen for creating, editing, activating, deactivating, and resetting admin/cashier accounts.

## Current Business Rule Coverage

- Roles are limited to admin and cashier.
- MVP remains single-store and online-only.
- Checkout, hold, and payment actions are disabled in the cashier UI while offline.
- Product prices are stored before tax and service charge.
- Tax and service charge are calculated at checkout/hold from settings.
- Paid cash orders create exactly one paid cash payment.
- Held orders do not create payments, reserve stock, deduct stock, or create stock movements.
- Cancelled unpaid orders do not create payments, reserve stock, deduct stock, or create stock movements.
- Paid, refunded, and already cancelled orders cannot be cancelled through the cancellation action.
- Paid orders deduct tracked stock only after payment confirmation.
- Server-side checkout rejects insufficient tracked stock.
- Cashiers can only list their own orders; admins can list all orders.
- Receipt reprint is available for paid orders.
- Admin user management keeps roles limited to admin and cashier.
- New and reset user passwords are hashed before storage.

## Validation

Run after each implementation pass:

- `npx prisma validate`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

## Remaining Milestone 1 Work

- Focused automated tests if a test runner is introduced.
