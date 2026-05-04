# 01 - Project Overview

## Project Name

POS System

## Purpose

The POS System is a web-based point-of-sale application for a single-store cafe. It supports cashier checkout, product catalog management, inventory tracking, cash payments, receipt output, kitchen queue operations, owner dashboard reporting, and operational accounting.

The product is designed as an online-only MVP with a modular monolith architecture so it can be built, deployed, and maintained quickly while keeping clear boundaries for future expansion.

## Problem Statement

Small cafe operators often rely on disconnected tools for cashier transactions, inventory, kitchen coordination, and daily reporting. This creates operational issues:

- Cashiers need a fast checkout screen that works well on touch devices.
- Owners need reliable product, stock, and sales data.
- Owners need basic cash, expense, and daily close visibility without using a separate spreadsheet.
- Kitchen staff need clear order sequencing and preparation status.
- Inventory changes must be traceable after sales, adjustments, and waste.
- Receipts and order history must remain accurate after catalog changes.

## Solution

The system centralizes cafe operations into one Next.js application:

- Cashiers create carts, hold orders, complete cash checkout, print receipts, and track kitchen status.
- Admins manage users, products, categories, settings, inventory, and reporting.
- Paid orders automatically create queue numbers and kitchen work.
- Inventory is deducted only after successful payment.
- Reports are calculated from persisted transaction records.
- Accounting records connect paid sales, cash movements, expenses, and daily close summaries without mutating POS history.

## Target Users

| User | Responsibilities |
| --- | --- |
| Admin | Manage catalog, settings, users, inventory, dashboard, reports, kitchen, queue, and operational controls |
| Cashier | Operate POS, create and hold orders, complete cash checkout, print receipts, view operational order history, and update kitchen/queue status |
| Kitchen staff, through cashier/admin access | Prepare paid orders, update kitchen status, and complete pickup workflow |
| Store operator | Deploy, configure, migrate, seed, and validate the app in local or production-like environments |

## MVP Scope

- Single-store cafe operation.
- Online-only checkout and mutations.
- Roles limited to `admin` and `cashier`.
- Product categories, products, variants, and store settings.
- Cash checkout with one payment per order.
- Held orders.
- Receipt preview and reprint.
- Ingredient inventory, recipes, stock adjustment, waste, and stock movement history.
- Daily queue numbers and kitchen statuses.
- Owner dashboard with sales, payment, product, stock, and cashier summaries.
- Operational accounting with chart of accounts, sales journals, expenses, cash movements, and daily close summaries.
- Production-readiness documentation and QA checklist.

## Explicit MVP Limits

- No multi-store support.
- No offline order creation or offline sync.
- No split payments.
- No active refund processing workflow in the current MVP implementation; refund schema/settings/reporting fields are reserved for future refund operations.
- No partial refunds.
- QRIS and Midtrans fields may exist, but active integration is deferred.
- No table management.
- No customer accounts or loyalty.
- No hardware integrations for cash drawers, barcode scanners, or physical receipt printers.
- No tax filing, payroll, bank reconciliation, or audited accounting-grade financial statements.

## High-Level Workflow

1. Admin configures store settings, users, categories, products, variants, ingredients, and recipes.
2. Cashier logs in and opens the POS.
3. Cashier selects products, variants, item notes, quantities, and discounts.
4. Cashier holds the order or proceeds to cash checkout.
5. Server recalculates totals, validates stock, creates the paid order, records payment, deducts stock, and assigns a queue number.
6. Cashier prints the receipt and gives the queue number to the customer.
7. Kitchen screen receives the paid order as `received`.
8. Staff move the kitchen order through `preparing`, `ready`, and `completed`.
9. Admin reviews dashboard reports, stock status, order history, and cashier performance.
10. Admin reviews accounting ledgers, expenses, and daily close records.

## Success Criteria

- Cashier can complete a cash sale quickly and accurately.
- Paid order data remains reliable for receipt, kitchen, queue, inventory, and reporting.
- Accounting records are auditable and do not mutate paid order/payment history.
- Stock is deducted only once and only after confirmed payment.
- Admin-only data and actions are blocked from cashier users.
- Key pages remain usable on desktop, tablet, and narrow mobile viewports.
- Production build, database migration, seed, test, and QA workflows are documented.
