# 04 - ERD: Database Design

## Overview

The database uses PostgreSQL through Prisma. The schema supports authentication, catalog, checkout, payments, refunds, inventory, queue/kitchen workflow, reporting, operational accounting, and activity logs.

## Entity Relationship Summary

```text
User 1--* Session
User 1--* Order
User 1--* ActivityLog
User 1--* StockMovement
User 1--* Refund

Category 1--* Product
Product 1--* ProductVariant
Product 1--* ProductOptionGroup
ProductOptionGroup 1--* ProductOptionValue
Product 1--* ProductIngredient
ProductVariant 1--* ProductIngredient
Ingredient 1--* ProductIngredient
ProductOptionValue 1--* ProductOptionValueIngredient
ProductOptionValue 1--* ProductOptionValueIngredientReplacement
Ingredient 1--* ProductOptionValueIngredient
Ingredient 1--* ProductOptionValueIngredientReplacement

Order 1--* OrderItem
Order 1--1 Payment
Order 1--* Refund
Order 1--* StockMovement
DiningTable 1--* Order

Product 1--* OrderItem
ProductVariant 1--* OrderItem
Payment 1--* Refund
Ingredient 1--* StockMovement
Product 1--* StockMovement

Account 1--* JournalEntryLine
JournalEntry 1--* JournalEntryLine
ExpenseCategory 1--* Expense
User 1--* Expense
User 1--* CashMovement
User 1--* DailyClose
```

## Enums

| Enum | Values |
| --- | --- |
| `UserRole` | `admin`, `cashier` |
| `OrderType` | `dine_in`, `takeaway`, `delivery` |
| `OrderStatus` | `draft`, `held`, `pending_payment`, `paid`, `cancelled`, `refunded` |
| `PaymentMethod` | `cash`, `qris` |
| `PaymentStatus` | `pending`, `paid`, `failed`, `expired`, `refunded` |
| `KitchenOrderStatus` | `received`, `preparing`, `ready`, `completed` |
| `StockMovementType` | `sale_deduction`, `adjustment`, `waste`, `refund_restore` |

## Core Tables

### `users`

Stores admin and cashier accounts.

Important fields:

- `id`
- `name`
- `email`
- `password_hash`
- `role`
- `is_active`
- `last_login_at`
- `created_at`
- `updated_at`

Rules:

- Email is unique.
- Passwords are stored as hashes only.
- Inactive users cannot log in.

### `sessions`

Stores active login sessions.

Important fields:

- `user_id`
- `token_hash`
- `expires_at`
- `revoked_at`

Rules:

- Session tokens are hashed.
- Expired or revoked sessions are invalid.
- Sessions are deleted when the user is deleted.

### `categories`

Groups products in the POS catalog.

Important fields:

- `name`
- `slug`
- `sort_order`
- `is_active`

Rules:

- Slug is unique.
- Inactive categories are hidden from cashier catalog views.

### `products`

Stores sellable catalog items.

Important fields:

- `category_id`
- `name`
- `sku`
- `description`
- `image_url`
- `price`
- `cost_price`
- `track_stock`
- `stock_quantity`
- `low_stock_threshold`
- `is_available`

Rules:

- SKU is unique when present.
- Products can be stock-tracked directly or through ingredient recipes.
- Historical orders use order item snapshots.

### `product_variants`

Legacy product variants. The current checkout flow uses structured option groups and option values instead of variants.

Important fields:

- `product_id`
- `name`
- `sku`
- `price_delta`
- `cost_delta`
- `is_active`

Rules:

- Variant checkout is no longer supported.
- Existing variant structures may remain for historical compatibility until fully removed.
- New menu customization should use product option groups and values.

### `product_option_groups`

Stores configurable option groups for products, such as temperature, size, sugar level, milk choice, or toppings.

Important fields:

- `product_id`
- `name`
- `selection_type`
- `is_required`
- `sort_order`
- `is_active`

Rules:

- Required active groups must have a selected active option value during checkout.
- `single` groups allow one selected value.
- `multiple` groups allow more than one selected value.

### `product_option_values`

Stores selectable values inside an option group.

Important fields:

- `group_id`
- `name`
- `price_delta`
- `sort_order`
- `is_active`

Rules:

- Final item unit price is product base price plus selected option value price deltas.
- Selected option names and price deltas are snapshotted on order items.

### `ingredients`

Stores raw inventory items.

Important fields:

- `name`
- `sku`
- `unit`
- `current_stock`
- `low_stock_threshold`
- `is_active`

Rules:

- Current stock cannot be negative under default MVP behavior.
- SKU is unique when present.
- Low stock is `current_stock <= low_stock_threshold`.

### `product_ingredients`

Defines base recipe requirements for products.

Important fields:

- `product_id`
- `variant_id`
- `ingredient_id`
- `quantity_required`

Rules:

- Quantity required must be greater than zero.
- Duplicate product/variant/ingredient recipe rows are blocked.
- Base product recipe rows are the default ingredient deductions for one product unit.
- Variant-specific recipe rows are legacy-compatible and should not be used for new customization.

### `product_option_value_ingredients`

Defines extra ingredient deductions for an option value.

Important fields:

- `option_value_id`
- `ingredient_id`
- `quantity_required`

Rules:

- Quantity required must be greater than zero.
- Duplicate ingredient rows are blocked per option value.
- These rows add to the base product recipe.
- Example: `Extra Shot` adds more `Espresso Beans` in addition to the base product recipe.

### `product_option_value_ingredient_replacements`

Defines ingredient substitutions for an option value.

Important fields:

- `option_value_id`
- `replaced_ingredient_id`
- `replacement_ingredient_id`
- `quantity_required`

Rules:

- Quantity required must be greater than zero.
- The replacement ingredient must be different from the replaced ingredient.
- One option value can have only one replacement rule per replaced ingredient.
- Replacement applies only when the product base recipe contains the replaced ingredient.
- Example: `Oat Milk` replaces `Fresh Milk` deduction with `Oat Milk` deduction.

### `app_settings`

Stores singleton store and checkout settings.

Important fields:

- `store_name`
- `store_address`
- `store_phone`
- `logo_url`
- `tax_enabled`
- `tax_rate`
- `service_charge_enabled`
- `service_charge_rate`
- `refund_window_hours`
- `auto_restore_stock_on_refund`
- `receipt_footer`
- `cash_payment_enabled`
- `qris_payment_enabled`
- `dine_in_pay_later_enabled`
- `kitchen_enabled`
- `queue_enabled`
- `inventory_enabled`
- `accounting_enabled`
- `reporting_enabled`
- `receipt_printing_enabled`

Rules:

- MVP expects one active settings row.
- Tax and service rates must be non-negative.
- At least one payment method must be enabled.
- QRIS is a manual payment method, not a gateway integration.
- Dine-in pay-later controls whether dine-in carts can be held/opened unpaid.

### `dining_tables`

Stores admin-managed dine-in tables.

Important fields:

- `name`
- `sort_order`
- `is_active`

Rules:

- Table name is unique.
- Inactive tables are hidden from POS selection.
- Existing orders keep their table reference when available.

### `orders`

Stores order headers, totals, payment state, queue identity, and kitchen lifecycle.

Important fields:

- `order_number`
- `cashier_id`
- `order_type`
- `table_id`
- `status`
- `subtotal_amount`
- `discount_amount`
- `tax_amount`
- `service_charge_amount`
- `total_amount`
- `delivery_customer_name`
- `delivery_customer_phone`
- `delivery_address`
- `delivery_notes`
- `queue_business_date`
- `queue_number`
- `kitchen_status`
- `held_at`
- `paid_at`
- `cancelled_at`
- `refunded_at`

Rules:

- Order number is unique.
- Existing and unspecified orders default to `takeaway`.
- `table_id` is used for dine-in order context.
- Delivery fields are used for delivery order context.
- Queue date and queue number are unique together.
- Paid orders can have queue and kitchen state.
- Kitchen status does not replace order payment/refund status.

### `order_items`

Stores immutable checkout item snapshots.

Important fields:

- `order_id`
- `product_id`
- `variant_id`
- `product_name_snapshot`
- `variant_name_snapshot`
- `quantity`
- `unit_price`
- `discount_amount`
- `line_total`
- `notes`

Rules:

- Receipts and reports use snapshots for historical display.
- Product catalog changes do not alter paid order item history.

### `order_item_option_selections`

Stores immutable selected option snapshots for each order item.

Important fields:

- `order_item_id`
- `option_group_id`
- `option_value_id`
- `group_name_snapshot`
- `value_name_snapshot`
- `price_delta`

Rules:

- Option group and value IDs may become null if catalog records are removed.
- Snapshot names and price deltas remain available for receipts and history.
- Selected options are the source of option-specific inventory deduction at checkout time.

### `payments`

Stores payment records.

Important fields:

- `order_id`
- `method`
- `status`
- `amount`
- `cash_received_amount`
- `change_amount`
- `provider`
- `provider_reference`
- `paid_at`
- `expires_at`

Rules:

- `order_id` is unique, enforcing one payment per order in the MVP.
- Cash payments require cash received and change amounts when paid.
- Manual QRIS payments are recorded as paid QRIS payments without provider callback, cash received, or change amounts.
- Provider fields are reserved for future provider-backed QRIS support.

### `refunds`

Stores refund records for future refund processing and reporting reconciliation. The current application schema supports these records, but the active refund creation/approval workflow is not implemented.

Important fields:

- `order_id`
- `payment_id`
- `approved_by_user_id`
- `amount`
- `reason`
- `stock_restored`

Rules:

- Refund reason is required.
- Refund approval is admin-owned.
- Full refund data is modeled for future workflow/reporting use.
- Partial refund behavior is excluded from the current MVP.

### `stock_movements`

Stores all stock changes.

Important fields:

- `ingredient_id`
- `product_id`
- `order_id`
- `type`
- `quantity_change`
- `reason`
- `created_by_user_id`

Rules:

- Sale deduction and waste are negative movements.
- Adjustment can be positive or negative.
- Manual changes require admin context and reason.
- Every stock quantity change must have a movement record.

### `activity_logs`

Stores operational audit events.

Important fields:

- `user_id`
- `action`
- `entity_type`
- `entity_id`
- `metadata`

Rules:

- Used for authentication, checkout, queue, kitchen, inventory, and other auditable workflow events.

## Accounting Models

Detailed accounting requirements are defined in [modules/accounting.md](modules/accounting.md). The accounting schema should add these models when implemented:

| Model | Purpose |
| --- | --- |
| `accounts` | Chart of accounts for cash, income, expense, liability, equity, and adjustment categories |
| `journal_entries` | Accounting transaction headers linked to source workflows such as orders, expenses, cash movements, and daily close |
| `journal_entry_lines` | Debit and credit lines that must balance for each journal entry |
| `expense_categories` | Admin-managed grouping for operating expenses |
| `expenses` | Manual expense records with amount, date, payment source, reason, category, and actor |
| `cash_movements` | Manual cash in/out records with amount, direction, reason, date, and actor |
| `daily_closes` | Business-date close records with expected cash, counted cash, difference, and closing actor |

Accounting rules:

- Paid orders and payments remain the source of truth for sales.
- Accounting entries must reference source records rather than mutate them.
- Journal entry debits and credits must balance.
- A paid order may produce at most one generated sales journal entry.
- A daily close is unique per business date.
- Accounting mutation records require admin actor context.

## Reporting Data Sources

Reports should aggregate from persisted source tables instead of duplicating data:

- `orders`
- `order_items`
- `payments`
- `refunds`
- `stock_movements`
- accounting tables
- `products`
- `ingredients`
- `users`

New reporting tables should be introduced only if query performance requires them.
