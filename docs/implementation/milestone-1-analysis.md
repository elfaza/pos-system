# Milestone 1 Document Analysis

Date: 2026-04-27

## Product Spec

The POS is a single Next.js monolith with frontend UI, Route Handler APIs, service logic, repository/data-access logic, Prisma, and PostgreSQL in one application. The MVP is single-store and online-only: creating, holding, paying, refunding, or completing orders requires an active connection, and the UI must block final checkout actions while offline.

Authentication supports login, logout, sessions, activity logs, and role-based access. Roles are limited to admin and cashier. Admin users can manage catalog, settings, users, and reporting surfaces. Cashiers can use the POS, hold and resume orders, accept payments, print/reprint receipts, and view the order/payment history needed for cashier work.

Checkout rules require one payment method per order in the MVP. Product prices are stored before tax and service charge. Tax and service charge are calculated from settings at checkout. Held orders do not deduct or reserve stock. Paid orders deduct tracked stock only after payment is confirmed. Server-side payment status is the source of truth.

Unpaid orders can be cancelled without inventory impact. Paid orders require refund handling instead of cancellation, because payment state and stock deduction have already been recorded.

## Selected Milestone

Selected file: `docs/milestone-1.md`.

Milestone 1 focuses on the core POS engine and transaction foundation. Required outputs include the Next.js app stack, Prisma/PostgreSQL schema and migration, seed data, auth/session foundation, protected admin and cashier layouts, product/category/settings management, POS checkout, cash payment, held orders, receipt output, order history, reconnect/offline blocking, and the database structure needed for later QRIS, inventory, queue, and reporting work.

The milestone scope rules keep the MVP single-store and online-only. It excludes split payment and partial refund. Roles stay limited to admin and cashier. Held orders must not reserve or deduct stock. Paid orders deduct stock only after confirmed payment.

## Design Guidelines

The UI should be operational, fast, touch-friendly, and simple. The palette should stay mostly white and blue, with green for success, orange for warnings/pending states, and red for errors or destructive states. Cashier workflows should keep product selection, cart, totals, and payment actions visible. Admin workflows should be dense, table-first, and predictable.

Major workflows need loading, empty, error, disabled, offline, and success states. POS controls should use large touch targets. Admin screens should use tables on desktop, responsive layouts, restrained borders, `rounded-md` or smaller corners, and clear primary actions.

## Implementation Implications

The implementation should preserve the existing architecture:

- Next.js UI pages under `src/app`.
- Next.js Route Handlers under `src/app/api`.
- Service-layer business rules under `src/features/*/services`.
- Prisma data access under `src/features/*/repositories`.
- Zustand for cashier cart/UI state.
- Prisma schema and migrations for durable domain data.

Checkout implementation must be transactionally correct: totals come from server-side settings, item snapshots are stored, stock is decremented only after paid cash confirmation, and stock movements are written for tracked products. Held orders share order/item snapshot behavior but do not create payments or stock movements.

Cancellation implementation must be scoped to unpaid order states: draft, held, and pending payment. Cancelling an unpaid order sets `status` to `cancelled` and records `cancelledAt`, but does not create payment records, stock deductions, stock restorations, or stock movements.

Role boundaries must remain strict. Cashiers can use POS and see their own operational order history. Admins can manage users, products, categories, settings, and view all order history. Admin-only mutations must require an admin session.

UI changes need explicit state handling for loading, empty, error, disabled, offline, and success paths where relevant.

## Acceptance Checklist

- Users can sign in and out with active admin or cashier accounts.
- Inactive users cannot sign in.
- Cashier cannot access admin-only routes.
- Admin can manage categories, products, settings, and users.
- POS can search/filter products, add variants, edit quantities, add notes, hold orders, resume held orders, and accept cash payment.
- Offline state blocks hold and payment actions.
- Held orders create no payment records, stock deductions, or stock movements.
- Unpaid orders can be cancelled.
- Cancelled unpaid orders create no payment records, stock deductions, or stock movements.
- Paid, refunded, and already cancelled orders cannot be cancelled.
- Paid cash orders create one paid cash payment.
- Paid tracked products deduct stock only after payment confirmation.
- Order item snapshots preserve product names, variant names, quantities, prices, discounts, and notes.
- Receipts can be previewed and reprinted for paid orders.
- Order history is available to admin and cashier with proper role scoping.
- The implementation does not add out-of-scope table management, split payment, partial refund, QRIS, kitchen, queue, or reporting features.
- `npx prisma validate`, `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass after implementation.
