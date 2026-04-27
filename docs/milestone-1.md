# 🚀 Milestone 1: Core POS Engine & Transaction (Month 1-1.5)

## 🎯 Focus

Build the MVP foundation for an online-only, single-store café POS. This milestone must support product setup, cashier checkout, cash payment, order persistence, receipt output, and the database structure needed to extend into QRIS, inventory, queue, and reporting.

---

## 🧭 Scope Rules

- MVP is single-store only, but schema should not block future multi-branch support.
- MVP is online-only. Checkout, hold, payment, refund, and completion actions require active internet.
- Roles are limited to `admin` and `cashier`.
- One order uses one payment method only.
- Split payment and partial refund are excluded from this milestone.
- Product prices are stored before tax and service charge.
- Tax and service charge are calculated at checkout from settings.
- Stock is deducted only after payment is confirmed.
- Held orders do not reserve or deduct stock.

---

## 🧱 WBS 1.0: Core Engine & Transaction

---

### 1.1 ⚙️ Project Initialization & Environment Setup

- **1.1.1 Application Stack**
  - Next.js application
  - TypeScript
  - Tailwind CSS
  - Next.js Route Handlers for API
  - Prisma ORM
  - PostgreSQL
  - TanStack Query for server state
  - Zustand for cashier cart/UI state

- **1.1.2 Database Foundation**
  - Create Prisma schema
  - Create initial migrations
  - Add seed data for admin user, cashier user, categories, products, and settings
  - Use enum fields for roles and statuses

- **1.1.3 Backend Structure**
  - Route handlers for auth, products, categories, orders, payments, and settings
  - Service layer for checkout calculations and order finalization
  - Repository/data-access layer for Prisma queries
  - Request validation for all mutation endpoints

- **1.1.4 Frontend Structure**
  - Protected admin layout
  - Protected cashier layout
  - POS checkout page
  - Product/category management pages
  - Basic order history page
  - Reconnect/offline blocking state

- **1.1.5 DevOps Setup**
  - Environment variables for database, auth secret, and app URL
  - Local development setup
  - Basic CI command for typecheck/lint/test if configured

---

### 1.2 🗄️ Database Tables

The following tables are required for Milestone 1. Names can be adapted to Prisma naming conventions, but the model relationships and fields should stay equivalent.

#### `users`

Purpose: stores system users for admin and cashier access.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/CUID | Yes | Primary key |
| `name` | String | Yes | Display name |
| `email` | String | Yes | Unique login identifier |
| `password_hash` | String | Yes | Never store plain password |
| `role` | Enum | Yes | `admin`, `cashier` |
| `is_active` | Boolean | Yes | Default `true` |
| `last_login_at` | DateTime | No | Updated on successful login |
| `created_at` | DateTime | Yes | Default now |
| `updated_at` | DateTime | Yes | Auto updated |

Rules:
- `email` must be unique.
- Cashier cannot access admin routes.
- Inactive users cannot log in.

#### `sessions`

Purpose: tracks active user sessions.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/CUID | Yes | Primary key |
| `user_id` | UUID/CUID | Yes | FK to `users.id` |
| `token_hash` | String | Yes | Hashed session token |
| `expires_at` | DateTime | Yes | Session expiry |
| `created_at` | DateTime | Yes | Default now |
| `revoked_at` | DateTime | No | Set on logout/manual revoke |

Rules:
- Expired or revoked sessions are invalid.
- Session checks protect API routes and page access.

#### `categories`

Purpose: groups products in POS menu and admin catalog.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/CUID | Yes | Primary key |
| `name` | String | Yes | Example: Coffee, Non-Coffee, Food |
| `slug` | String | Yes | Unique URL/search key |
| `sort_order` | Integer | Yes | Default `0` |
| `is_active` | Boolean | Yes | Default `true` |
| `created_at` | DateTime | Yes | Default now |
| `updated_at` | DateTime | Yes | Auto updated |

Rules:
- `slug` must be unique.
- Inactive categories are hidden from cashier POS.

#### `products`

Purpose: stores sellable menu items.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/CUID | Yes | Primary key |
| `category_id` | UUID/CUID | Yes | FK to `categories.id` |
| `name` | String | Yes | Product display name |
| `sku` | String | No | Unique when provided |
| `description` | String | No | Admin/catalog description |
| `image_url` | String | No | Product image |
| `price` | Decimal | Yes | Selling price before tax/service |
| `cost_price` | Decimal | No | COGS reference |
| `track_stock` | Boolean | Yes | Default `false` for simple MVP products |
| `stock_quantity` | Decimal | No | Used when `track_stock = true` |
| `low_stock_threshold` | Decimal | No | Optional alert threshold |
| `is_available` | Boolean | Yes | Cashier visibility toggle |
| `created_at` | DateTime | Yes | Default now |
| `updated_at` | DateTime | Yes | Auto updated |

Rules:
- Product price must be greater than or equal to `0`.
- Products with insufficient stock cannot be checked out when stock tracking is enabled.
- Product deletion should be soft-delete later if historical reporting needs exact names/prices.

#### `product_variants`

Purpose: supports product options such as size or temperature without redesigning product data later.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/CUID | Yes | Primary key |
| `product_id` | UUID/CUID | Yes | FK to `products.id` |
| `name` | String | Yes | Example: Regular, Large, Iced |
| `sku` | String | No | Unique when provided |
| `price_delta` | Decimal | Yes | Added to product base price |
| `cost_delta` | Decimal | No | Added to base cost |
| `is_active` | Boolean | Yes | Default `true` |
| `created_at` | DateTime | Yes | Default now |
| `updated_at` | DateTime | Yes | Auto updated |

Rules:
- If a product has no variants, checkout uses base product price.
- Variant price is `product.price + variant.price_delta`.

#### `app_settings`

Purpose: stores configurable store, tax, service, receipt, and refund behavior.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/CUID | Yes | Primary key |
| `store_name` | String | Yes | Receipt and UI display |
| `store_address` | String | No | Receipt display |
| `store_phone` | String | No | Receipt display |
| `logo_url` | String | No | Store logo |
| `tax_enabled` | Boolean | Yes | Default `false` |
| `tax_rate` | Decimal | Yes | Default `0` |
| `service_charge_enabled` | Boolean | Yes | Default `false` |
| `service_charge_rate` | Decimal | Yes | Default `0` |
| `refund_window_hours` | Integer | No | Optional admin refund policy |
| `auto_restore_stock_on_refund` | Boolean | Yes | Default `false` |
| `receipt_footer` | String | No | Thank-you message |
| `created_at` | DateTime | Yes | Default now |
| `updated_at` | DateTime | Yes | Auto updated |

Rules:
- MVP should have exactly one active settings row.
- Tax and service percentages must be greater than or equal to `0`.
- Default pricing mode is tax-exclusive and service-exclusive.

#### `orders`

Purpose: stores checkout/order headers.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/CUID | Yes | Primary key |
| `order_number` | String | Yes | Human-readable unique receipt number |
| `cashier_id` | UUID/CUID | Yes | FK to `users.id` |
| `status` | Enum | Yes | `draft`, `held`, `pending_payment`, `paid`, `cancelled`, `refunded` |
| `subtotal_amount` | Decimal | Yes | Sum before discount/tax/service |
| `discount_amount` | Decimal | Yes | Default `0` |
| `tax_amount` | Decimal | Yes | Default `0` |
| `service_charge_amount` | Decimal | Yes | Default `0` |
| `total_amount` | Decimal | Yes | Final payable amount |
| `notes` | String | No | Order-level note |
| `held_at` | DateTime | No | Set when order is held |
| `paid_at` | DateTime | No | Set after payment confirmed |
| `cancelled_at` | DateTime | No | Set when unpaid order cancelled |
| `refunded_at` | DateTime | No | Set when full refund completed |
| `created_at` | DateTime | Yes | Default now |
| `updated_at` | DateTime | Yes | Auto updated |

Rules:
- `order_number` must be unique.
- `paid` orders must have at least one `paid` payment.
- Stock deduction happens when order becomes `paid`.
- Held orders do not deduct stock.

#### `order_items`

Purpose: stores line items for each order.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/CUID | Yes | Primary key |
| `order_id` | UUID/CUID | Yes | FK to `orders.id` |
| `product_id` | UUID/CUID | Yes | FK to `products.id` |
| `variant_id` | UUID/CUID | No | FK to `product_variants.id` |
| `product_name_snapshot` | String | Yes | Preserves historical receipt/report data |
| `variant_name_snapshot` | String | No | Preserves selected variant name |
| `quantity` | Decimal | Yes | Item quantity |
| `unit_price` | Decimal | Yes | Price at time of sale |
| `discount_amount` | Decimal | Yes | Default `0` |
| `line_total` | Decimal | Yes | Quantity x price minus discount |
| `notes` | String | No | Example: less sugar, no ice |
| `created_at` | DateTime | Yes | Default now |

Rules:
- Quantity must be greater than `0`.
- Snapshot fields must be filled during checkout.
- Product price changes must not change historical order items.

#### `payments`

Purpose: records payment attempts and confirmed payment state.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/CUID | Yes | Primary key |
| `order_id` | UUID/CUID | Yes | FK to `orders.id` |
| `method` | Enum | Yes | `cash`, `qris` |
| `status` | Enum | Yes | `pending`, `paid`, `failed`, `expired`, `refunded` |
| `amount` | Decimal | Yes | Payment amount |
| `cash_received_amount` | Decimal | No | Cash only |
| `change_amount` | Decimal | No | Cash only |
| `provider` | String | No | Example: Midtrans |
| `provider_reference` | String | No | Gateway transaction/order reference |
| `paid_at` | DateTime | No | Set when confirmed |
| `expires_at` | DateTime | No | QRIS expiry |
| `created_at` | DateTime | Yes | Default now |
| `updated_at` | DateTime | Yes | Auto updated |

Rules:
- One order has one payment in MVP.
- Cash payment can be confirmed by cashier submit.
- QRIS payment is confirmed by Midtrans webhook/callback.
- Server payment status is the source of truth.

#### `refunds`

Purpose: records full refund events.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/CUID | Yes | Primary key |
| `order_id` | UUID/CUID | Yes | FK to `orders.id` |
| `payment_id` | UUID/CUID | Yes | FK to `payments.id` |
| `approved_by_user_id` | UUID/CUID | Yes | FK to `users.id`, admin only |
| `amount` | Decimal | Yes | Must equal full order total in MVP |
| `reason` | String | Yes | Required refund reason |
| `stock_restored` | Boolean | Yes | Default `false` |
| `created_at` | DateTime | Yes | Default now |

Rules:
- MVP supports full refund only.
- Only admin can approve/process refund.
- Stock restoration requires admin confirmation.

#### `stock_movements`

Purpose: audit trail for stock deductions, adjustments, waste, and refund restoration.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/CUID | Yes | Primary key |
| `product_id` | UUID/CUID | Yes | FK to `products.id` |
| `order_id` | UUID/CUID | No | FK to `orders.id` when movement comes from sale/refund |
| `type` | Enum | Yes | `sale_deduction`, `adjustment`, `waste`, `refund_restore` |
| `quantity_change` | Decimal | Yes | Negative for deduction, positive for restore |
| `reason` | String | No | Required for manual adjustment/waste |
| `created_by_user_id` | UUID/CUID | No | FK to `users.id` |
| `created_at` | DateTime | Yes | Default now |

Rules:
- Every stock change must create a stock movement.
- Paid orders create `sale_deduction` movements for tracked products.
- Manual adjustment and waste are admin-only.

#### `activity_logs`

Purpose: records important user and system actions for auditing.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/CUID | Yes | Primary key |
| `user_id` | UUID/CUID | No | FK to `users.id`, nullable for system/webhook actions |
| `action` | String | Yes | Example: `order.paid`, `product.created` |
| `entity_type` | String | No | Example: `order`, `product`, `payment` |
| `entity_id` | String | No | Related record id |
| `metadata` | JSON | No | Extra context |
| `created_at` | DateTime | Yes | Default now |

Rules:
- Log login, logout, product changes, order payment, refund, settings changes, and stock adjustment.
- Webhook-driven payment updates should be logged as system actions.

---

### 1.3 🔐 Authentication & User Management

- **1.3.1 Login / Logout**
  - Email and password login
  - Session-based authentication
  - Logout revokes current session

- **1.3.2 Role-Based Access Control**
  - `admin` can access all modules
  - `cashier` can access cashier POS, checkout, receipt, and basic order history
  - Protect API endpoints and UI navigation

- **1.3.3 Session Handling**
  - Token/session expiration
  - Inactive user blocking
  - Redirect unauthenticated users to login

---

### 1.4 📦 Product & Category Management

- **1.4.1 Category CRUD**
  - Create, update, disable, and sort categories
  - Hide inactive categories from POS

- **1.4.2 Product Master Data**
  - Name, SKU, category, price, cost price, image, and availability
  - Optional stock tracking fields
  - Product search by name/SKU/category

- **1.4.3 Product Variants**
  - Optional variants per product
  - Variant price delta support
  - Variant active/inactive state

- **1.4.4 Image Upload**
  - Product image upload or image URL storage
  - Admin-only access

---

### 1.5 🧾 POS Checkout Module

- **1.5.1 Product Grid / Menu Display**
  - Category filter
  - Product search
  - Availability filtering
  - Variant selection when product has variants

- **1.5.2 Cart System**
  - Add/remove items
  - Update quantity
  - Add item notes
  - Calculate subtotal, discount, tax, service charge, and total

- **1.5.3 Hold / Resume Order**
  - Save order as `held`
  - Resume held order into cart
  - Held orders do not deduct stock

- **1.5.4 Online-Only Guard**
  - Detect lost connection
  - Disable checkout, hold, payment, refund, and complete actions while offline
  - Show reconnect state before cashier can continue

---

### 1.6 💳 Payment System

- **1.6.1 Cash Payment**
  - Input cash received amount
  - Calculate change
  - Mark payment as `paid`
  - Mark order as `paid`
  - Deduct tracked stock after payment success

- **1.6.2 QRIS Preparation**
  - Add payment model fields for provider reference and expiry
  - Implement service boundary for Midtrans integration later
  - Do not rely on browser success state for final paid status

- **1.6.3 Transaction Persistence**
  - Save order and order items
  - Save payment record
  - Save stock movements for tracked products
  - Save activity logs

- **1.6.4 Transaction History**
  - Cashier can view basic order/payment history
  - Admin can view all order/payment history

---

### 1.7 🖨️ Receipt & Settings

- **1.7.1 Receipt Template**
  - Store name, address, phone
  - Receipt/order number
  - Cashier name
  - Order items, quantities, notes, and prices
  - Subtotal, discount, tax, service charge, total
  - Payment method, paid amount, and change
  - Footer message

- **1.7.2 Reprint Receipt**
  - Cashier can reprint basic receipts from order history
  - Reprint should use historical order item snapshots

- **1.7.3 Store Settings**
  - Store profile
  - Tax enabled/rate
  - Service charge enabled/rate
  - Receipt footer
  - Refund window and stock restore behavior

---

## ✅ Milestone Output

After completing this milestone, the system will allow:

- Admin to log in and manage categories, products, variants, settings, and users.
- Cashier to log in and access only POS-related screens.
- Cashier to create, hold, resume, and complete cash orders.
- System to calculate tax and service charge from settings.
- System to persist orders, order items, payments, stock movements, and activity logs.
- System to deduct stock after successful payment.
- Cashier to view basic transaction history and print/reprint receipts.
- UI to block checkout actions when offline.

---

## 🚫 Explicitly Out of Scope for Milestone 1

- Multi-branch support
- Offline order sync
- Split payment
- Partial refund
- Full Midtrans QRIS production flow
- Kitchen Display System
- Queue display
- Table management
- Customer loyalty
- Advanced reports
