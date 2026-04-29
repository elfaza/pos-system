# 🚀 Milestone 2: Inventory System (2 Weeks)

## 🎯 Focus

Build the real inventory layer for the café POS so admin users can manage ingredient stock, the system can deduct inventory after sales, and the store can see low-stock risks before items run out.

---

## 🧭 Scope Rules

- MVP remains single-store only.
- MVP remains online-only. Stock setup, adjustment, and sales deduction require active internet.
- Roles remain limited to `admin` and `cashier`.
- Admin manages inventory and stock adjustments.
- Cashier does not manage inventory directly.
- Stock deduction happens only after an order is successfully paid.
- Held orders do not reserve or deduct stock.
- Cancelled unpaid orders do not affect stock.
- This milestone focuses on ingredient inventory, not supplier purchasing or recipe costing reports.
- Negative stock is blocked by default.

---

## 🧱 WBS 2.0: Inventory System

---

### 2.1 📦 Ingredient Stock

- **2.1.1 Ingredient Master Data**
  - Add ingredient records for raw materials used by products.
  - Store ingredient name, SKU/code, unit, current stock, low-stock threshold, and active state.
  - Support decimal quantities for units such as grams, milliliters, kilograms, and liters.
  - Allow inactive ingredients to stay in historical records but hide from new recipe setup.

- **2.1.2 Product Ingredient Recipes**
  - Link products to ingredients through recipe rows.
  - Define quantity of each ingredient needed per product unit sold.
  - Support variant-specific recipe differences where needed.
  - Prevent recipe setup with inactive or missing ingredients.

- **2.1.3 Inventory Admin Screen**
  - Admin can view ingredient list.
  - Admin can create and edit ingredients.
  - Admin can view current stock and low-stock threshold.
  - Admin can filter by active state and low-stock state.
  - Admin can search by ingredient name or SKU/code.

---

### 2.2 🔻 Stock Deduction

- **2.2.1 Deduction After Payment**
  - Deduct ingredient stock only after successful payment.
  - Use order item snapshots and current product recipes to calculate ingredient usage.
  - Deduct once per paid order.
  - Create stock movement records for each deducted ingredient.

- **2.2.2 Insufficient Stock Blocking**
  - Before checkout completion, validate that all required ingredients have enough stock.
  - Block checkout when required ingredient stock is insufficient.
  - Return a clear error listing the unavailable ingredient or product impact.
  - Do not create a paid order when inventory validation fails.

- **2.2.3 Deduction Audit Trail**
  - Every sale deduction creates stock movement history.
  - Stock movement links to the related order when available.
  - Movement stores ingredient, quantity change, type, reason/context, and timestamp.
  - Sale deduction movements use negative quantity.

---

### 2.3 ⚠️ Low Stock Alerts

- **2.3.1 Low Stock Rules**
  - Ingredient is low stock when `current_stock <= low_stock_threshold`.
  - Ingredient is out of stock when `current_stock <= 0`.
  - Ingredients without threshold do not show as low stock.
  - Inactive ingredients are hidden from active low-stock alerts.

- **2.3.2 Admin Alert Surface**
  - Admin dashboard shows low-stock ingredient count.
  - Inventory page highlights low-stock and out-of-stock rows.
  - Admin can filter inventory list to low-stock only.

- **2.3.3 POS Safety**
  - Cashier checkout is blocked if recipe ingredients are insufficient.
  - POS product display can show unavailable state when ingredient stock cannot satisfy one unit.
  - Low-stock state is informational; insufficient stock is blocking.

---

### 2.4 🔧 Stock Adjustment

- **2.4.1 Manual Adjustment**
  - Admin can increase or decrease ingredient stock.
  - Adjustment requires quantity, direction, and reason.
  - Adjustment creates stock movement record.
  - Ingredient current stock updates in the same database transaction.

- **2.4.2 Waste / Spoilage**
  - Admin can record waste as a stock decrease.
  - Waste requires quantity and reason.
  - Waste cannot reduce stock below zero.
  - Waste creates stock movement record with type `waste`.

- **2.4.3 Adjustment History**
  - Admin can view stock movement history.
  - History can be filtered by ingredient, movement type, and date range.
  - History shows sale deductions, manual adjustments, and waste records.

---

### 2.5 🗄️ Database Tables

The following tables are required for Milestone 2. Names can be adapted to Prisma naming conventions, but relationships and fields should stay equivalent.

#### `ingredients`

Purpose: stores raw ingredient inventory.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/CUID | Yes | Primary key |
| `name` | String | Yes | Example: Espresso Beans, Milk, Sugar |
| `sku` | String | No | Unique when provided |
| `unit` | Enum/String | Yes | Example: gram, ml, pcs |
| `current_stock` | Decimal | Yes | Current available stock |
| `low_stock_threshold` | Decimal | No | Alert threshold |
| `is_active` | Boolean | Yes | Default `true` |
| `created_at` | DateTime | Yes | Default now |
| `updated_at` | DateTime | Yes | Auto updated |

Rules:
- `current_stock` must be greater than or equal to `0`.
- `low_stock_threshold` must be greater than or equal to `0` when provided.
- `sku` must be unique when provided.

#### `product_ingredients`

Purpose: defines recipe ingredients required to sell one product or variant.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/CUID | Yes | Primary key |
| `product_id` | UUID/CUID | Yes | FK to `products.id` |
| `variant_id` | UUID/CUID | No | FK to `product_variants.id` when recipe is variant-specific |
| `ingredient_id` | UUID/CUID | Yes | FK to `ingredients.id` |
| `quantity_required` | Decimal | Yes | Ingredient quantity required per sold unit |
| `created_at` | DateTime | Yes | Default now |
| `updated_at` | DateTime | Yes | Auto updated |

Rules:
- `quantity_required` must be greater than `0`.
- A product can have multiple ingredients.
- A variant recipe overrides or extends product-level recipe rules based on implementation decision.
- Duplicate ingredient rows for the same product/variant should be blocked.

#### Changed `stock_movements`

Purpose: records all inventory changes for ingredients.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `ingredient_id` | UUID/CUID | Yes | FK to `ingredients.id` |
| `product_id` | UUID/CUID | No | Optional context for sale deduction |
| `order_id` | UUID/CUID | No | FK to `orders.id` when movement comes from sale |
| `type` | Enum | Yes | `sale_deduction`, `adjustment`, `waste` |
| `quantity_change` | Decimal | Yes | Negative for deduction/waste, positive or negative for adjustment |
| `reason` | String | No | Required for adjustment and waste |
| `created_by_user_id` | UUID/CUID | No | Admin user for manual changes |
| `created_at` | DateTime | Yes | Default now |

Rules:
- Sale deduction movements are created by the system after payment.
- Adjustment and waste movements require admin user id.
- Adjustment and waste require reason.
- Every stock quantity change must create a stock movement.

---

### 2.6 🔐 Roles & Permissions

| Workflow | Admin | Cashier | Notes |
| --- | --- | --- | --- |
| View ingredient inventory | Yes | No | Cashier only sees POS availability |
| Create/edit ingredients | Yes | No | Admin-only |
| Create/edit product recipes | Yes | No | Admin-only |
| View low-stock alerts | Yes | No | Admin dashboard/inventory page |
| Adjust stock | Yes | No | Reason required |
| Record waste | Yes | No | Reason required |
| View stock movement history | Yes | No | Admin audit trail |
| Trigger stock deduction through paid checkout | Yes | Yes | Happens automatically after payment |

Rules:
- API authorization must enforce the same permissions as UI navigation.
- Cashier must not access inventory mutation endpoints.
- Stock deduction during checkout runs server-side and cannot be bypassed by the client.

---

### 2.7 🧮 Stock Calculation Rules

- Ingredient deduction quantity = order item quantity x recipe quantity required.
- Decimal stock values must be handled consistently with existing number helpers.
- Stock deduction must run in the same transaction as payment/order finalization where possible.
- If any ingredient is insufficient, the checkout must fail before payment is marked paid.
- Sale deduction must happen exactly once for each paid order.
- Held orders do not deduct or reserve ingredient stock.
- Cancelled unpaid orders do not affect ingredient stock.
- Manual adjustment quantity must be greater than `0`.
- Waste quantity must be greater than `0`.
- Movement signs remain consistent:
  - `sale_deduction`: negative
  - `adjustment`: positive or negative
  - `waste`: negative

---

### 2.8 🌐 Offline & Connectivity Rules

- Inventory pages require active connection for create, update, adjustment, and waste actions.
- Checkout cannot complete while offline.
- Stock validation must run on the server during checkout.
- If connection is lost, inventory forms and checkout actions must be disabled.
- Previously loaded inventory data may remain visible while offline, but mutation actions are blocked.

---

### 2.9 🧪 Testing Requirements

- **2.9.1 Ingredient Tests**
  - Create ingredient with valid data.
  - Reject negative current stock.
  - Reject negative low-stock threshold.
  - Enforce unique SKU when provided.
  - Hide inactive ingredients from new recipe selection.

- **2.9.2 Recipe Tests**
  - Create product ingredient recipe.
  - Reject zero or negative required quantity.
  - Reject duplicate ingredient recipe rows for same product/variant.
  - Calculate required ingredient quantity from order quantity.

- **2.9.3 Stock Deduction Tests**
  - Paid order deducts ingredient stock.
  - Held order does not deduct stock.
  - Cancelled unpaid order does not deduct stock.
  - Insufficient ingredient stock blocks checkout.
  - Paid order cannot deduct stock twice.
  - Sale deduction creates stock movement records.

- **2.9.4 Stock Adjustment Tests**
  - Admin can increase ingredient stock.
  - Admin can decrease ingredient stock.
  - Adjustment requires reason.
  - Waste decreases stock and creates movement.
  - Waste cannot reduce stock below zero.
  - Cashier cannot adjust stock or record waste.

- **2.9.5 Frontend Workflow Tests**
  - Inventory list loading, empty, error, and success states.
  - Low-stock and out-of-stock visual states.
  - Ingredient form validation.
  - Stock adjustment form validation.
  - Offline disabled state for inventory mutations.

---

## ✅ Milestone Output

After completing this milestone, the system will allow:

- Admin to create and manage ingredient stock.
- Admin to define product recipes using ingredients.
- System to deduct ingredient stock after successful paid checkout.
- System to block checkout when ingredients are insufficient.
- Admin to see low-stock and out-of-stock alerts.
- Admin to adjust stock with required audit reasons.
- Admin to record waste/spoilage.
- Admin to view stock movement history.
- Cashier to continue selling through POS while inventory deduction happens automatically.

Goal: real inventory works.

---

## 🚫 Explicitly Out of Scope for Milestone 2

- QRIS payment integration
- Refund management
- Supplier management
- Purchase orders
- Ingredient cost reporting
- Recipe costing and margin analysis
- Multi-branch inventory
- Offline inventory sync
- Barcode scanner integration
- Kitchen Display System
- Queue display
- Table management
- Customer loyalty
- Advanced reports
