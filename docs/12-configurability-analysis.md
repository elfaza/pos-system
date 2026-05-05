# 12 - Configurability Analysis

## Purpose

This document identifies POS modules and features that should be configurable, based on the current product requirements, Prisma schema, service logic, and UI routes.

The goal is to make business behavior adjustable without code changes while keeping core transactional integrity, security, and audit rules stable.

## Configuration Principles

- Keep configuration explicit and validated in the server layer.
- Prefer typed settings over unstructured JSON for critical business rules.
- Use feature flags for enabling or hiding modules, but keep authorization checks enforced independently.
- Store operational settings in the database when admins should manage them from the dashboard.
- Keep deployment and secret settings in environment variables.
- Snapshot values onto transactional records when historical accuracy matters, such as order totals, payment data, and receipt labels.
- Audit changes to settings that affect money, stock, access, accounting, or compliance.

## Existing Configurable Surface

The current application already has a small `AppSetting` model and a dashboard settings screen.

| Area | Current configurable fields | Used by |
| --- | --- | --- |
| Store profile | Store name, address, phone, logo URL | Receipt and settings UI |
| Checkout charges | Tax enabled, tax rate, service charge enabled, service charge rate | Checkout total calculation |
| Refund policy placeholders | Refund window hours, auto restore stock on refund | Persisted but not active in a refund workflow yet |
| Receipt content | Receipt footer | Receipt preview and printing |
| Auth session lifetime | `AUTH_SESSION_DAYS` environment value | Session expiry |
| Database connection | `DATABASE_URL` environment value | Prisma/PostgreSQL |

## Recommended Configuration Model

Use three configuration scopes:

| Scope | Storage | Examples |
| --- | --- | --- |
| Deployment config | Environment variables | Database URL, session lifetime, provider secrets |
| Store config | `AppSetting` or related typed tables | Tax, service charge, business timezone, receipt, queue, payment options |
| Feature config | Typed feature/module settings table | Enable kitchen, inventory, accounting, reporting cards, payment methods |

For implementation, keep `AppSetting` for single-store MVP settings, then introduce module-specific settings only when the field count or permissions become too broad.

Suggested future shape:

```text
AppSetting
  store profile
  locale/timezone/currency
  receipt behavior
  global feature toggles

CheckoutSetting
  payment methods
  discounts
  hold/cancel behavior
  order numbering

KitchenSetting
  queue behavior
  enabled statuses
  active board rules

InventorySetting
  stock deduction and low-stock rules

AccountingSetting
  default account mappings
  daily close and journal behavior
```

## Module Analysis

### 1. Authentication And User Management

Configurable candidates:

| Feature | Recommendation | Priority |
| --- | --- | --- |
| Session duration | Keep configurable by environment for deployment control. | Current |
| Password policy | Add configurable minimum length, complexity, and reset rules before wider user onboarding. | Medium |
| Login redirect by role | Make configurable only if more roles are introduced. Current admin/cashier redirect can stay hard-coded. | Low |
| Role permissions | Move toward permission flags if roles grow beyond admin/cashier. Do not replace server authorization checks with UI-only toggles. | Medium |
| User activation behavior | Keep per-user configurable through `isActive`. | Current |

Not recommended as admin-configurable:

- Password hashing algorithm at runtime.
- Session token cookie name.
- Authorization bypass rules.

### 2. Catalog

Configurable candidates:

| Feature | Recommendation | Priority |
| --- | --- | --- |
| Categories | Already configurable as master data. | Current |
| Products and variants | Already configurable as master data. | Current |
| Product availability | Already configurable per product/variant. | Current |
| SKU requirement | Add a store setting if operators need mandatory SKUs for inventory/accounting discipline. | Low |
| Product image behavior | Add limits/default placeholder only if image upload is introduced. | Low |
| Price and cost visibility | Add role or feature setting if cashier screens should hide cost data. | Medium |
| Variant support | Could be module-configurable, but keep enabled while variants are part of the schema and checkout flow. | Low |

### 3. Store Settings

Configurable candidates:

| Feature | Recommendation | Priority |
| --- | --- | --- |
| Store profile | Already configurable. | Current |
| Tax | Already configurable. Add tax label and inclusive/exclusive mode if required. | High |
| Service charge | Already configurable. Add label and calculation mode if required. | Medium |
| Currency | Add currency code, locale, decimal precision, and display format. Current helpers assume Indonesian Rupiah-style formatting in places. | High |
| Business timezone | Add database-backed setting and replace hard-coded `Asia/Jakarta` usages. | High |
| Business day cutoff | Add if the store closes after midnight or needs shift-based reporting. | Medium |
| Receipt template | Extend current footer/profile fields with receipt header, paper width, show/hide fields, and print copy count. | Medium |

### 4. POS Checkout

Configurable candidates:

| Feature | Recommendation | Priority |
| --- | --- | --- |
| Payment methods | Make cash/QRIS availability configurable. Current schema supports both, but active checkout is cash-focused. | High |
| Discount rules | Add max item discount, max order discount, percent/fixed modes, and role approval threshold. | High |
| Hold order behavior | Add hold enablement, maximum held order age, and cashier ownership rules. | Medium |
| Cancellation rules | Add cancellation window and admin approval requirement. | Medium |
| Stock validation mode | Add setting for strict stock blocking versus warning-only for non-tracked items. Keep tracked recipe stock strict by default. | Medium |
| Notes requirements | Add optional rules for required cancel/discount/hold notes. | Low |
| Order number format | Add configurable prefix and reset policy if operations require branded order numbers. | Medium |
| Queue assignment | Allow checkout to skip queue/kitchen assignment for product categories that do not require preparation. | High |

Not recommended as configurable:

- Server-side recalculation before payment.
- Transactional order/payment creation.
- Cash received must cover cash order total.

### 5. Cash Payment And Future QRIS

Configurable candidates:

| Feature | Recommendation | Priority |
| --- | --- | --- |
| Cash payment enabled | Add to payment settings. | High |
| QRIS payment enabled | Add when active provider integration is implemented. | High |
| Payment expiry | Add for QRIS or pending payment flows. | Medium |
| Cash rounding | Add if the store rounds cash totals or change to a denomination. | Medium |
| Provider credentials | Keep in environment variables or secure secret storage, referenced by provider setting. | High |
| Provider selection | Add configurable provider key, such as manual QRIS, Midtrans, or Xendit, once integrated. | Medium |

### 6. Receipt

Configurable candidates:

| Feature | Recommendation | Priority |
| --- | --- | --- |
| Store details and footer | Already configurable. | Current |
| Receipt fields | Add show/hide controls for SKU, cashier, queue number, tax, service charge, notes, and payment reference. | Medium |
| Paper size | Add 58mm/80mm setting before hardware printer support. | Medium |
| Print behavior | Add auto-print after checkout and copy count settings when browser/hardware integration is added. | Low |
| Receipt branding | Extend current logo URL with header text and optional QR code. | Low |

### 7. Inventory

Configurable candidates:

| Feature | Recommendation | Priority |
| --- | --- | --- |
| Ingredient units | Already configurable as ingredient data. | Current |
| Product recipes | Already configurable through product ingredients. | Current |
| Low-stock thresholds | Already configurable per ingredient/product. | Current |
| Stock tracking per product | Already configurable per product. | Current |
| Negative stock policy | Add setting. Current service blocks reductions below zero. | Medium |
| Waste reason requirements | Keep reason required; optionally add a managed reason list. | Medium |
| Stock deduction timing | Add if future workflows need deduction at paid, preparing, completed, or manual fulfillment. Current behavior deducts at paid checkout. | Medium |
| Low-stock alert threshold defaults | Add default threshold per unit/category to reduce repetitive setup. | Low |
| Inventory module toggle | Add only if the app must run for stores without stock tracking. Product checkout must still behave safely when disabled. | Medium |

Not recommended as configurable:

- Stock movement audit creation.
- Transactional coupling between stock updates and movement records.

### 8. Kitchen And Queue

Configurable candidates:

| Feature | Recommendation | Priority |
| --- | --- | --- |
| Kitchen module enabled | Add feature setting so simple stores can hide kitchen routes and skip kitchen statuses. | High |
| Queue display enabled | Add feature setting independent from kitchen board visibility. | High |
| Business timezone | Use shared store timezone setting instead of hard-coded `Asia/Jakarta`. | High |
| Queue reset policy | Add daily reset, business-day cutoff, and optional prefix. | Medium |
| Kitchen status workflow | Make transition flow configurable only if the business needs simpler or richer states. Current received -> preparing -> ready -> completed flow is stable for MVP. | Low |
| Active board filters | Add configurable visibility for completed/ready order retention duration. | Medium |
| Category routing to kitchen | Add per-category or per-product `sendToKitchen` setting if some products do not require preparation. | High |

Not recommended as configurable:

- Queue number uniqueness for the business date.
- Rejection of invalid backward transitions unless an explicit admin correction workflow exists.

### 9. Reporting

Configurable candidates:

| Feature | Recommendation | Priority |
| --- | --- | --- |
| Date range limit | Replace hard-coded 31-day limit with a setting or environment guard. | Medium |
| Top product limit | Add configurable dashboard limit. Current value is hard-coded to 10. | Low |
| Business timezone | Use shared store timezone setting. | High |
| Dashboard card visibility | Add per-module or per-role report visibility settings. | Medium |
| Export formats | Add when CSV/PDF exports are implemented. | Low |
| Included statuses | Keep paid/refunded report rules stable unless refund/cancellation workflows expand. | Low |

Not recommended as configurable:

- Cashier report access without server-side admin authorization.
- Sales totals derived from mutable client state.

### 10. Accounting

Configurable candidates:

| Feature | Recommendation | Priority |
| --- | --- | --- |
| Chart of accounts | Already configurable as master data. | Current |
| Expense categories | Already configurable as master data. | Current |
| Default account mappings | Replace hard-coded account codes with settings, such as cash, QRIS clearing, sales, service charge, tax payable, operating expense, and variance accounts. | High |
| Auto-create default accounts | Add setting or setup workflow. Current service upserts defaults automatically. | Medium |
| Journal numbering format | Add configurable prefix/reset strategy if accounting requires formal sequence control. | Medium |
| Daily close requirement | Add setting to require daily close before next business day operations or leave it optional. | Medium |
| Cash variance handling | Configure account mapping and whether zero-variance closes create journal entries. | Medium |
| Accounting module enabled | Add feature setting if the app should run without accounting UI/API exposure. | High |

Not recommended as configurable:

- Journal entry balancing.
- Immutability of POS source records.
- Uniqueness of journal source references.

### 11. Admin Dashboard And Navigation

Configurable candidates:

| Feature | Recommendation | Priority |
| --- | --- | --- |
| Module visibility | Add feature flags for inventory, kitchen, queue, reports, and accounting. | High |
| Default landing page by role | Add only after role or module flags expand. | Medium |
| Sidebar ordering | Keep static for MVP; make configurable only for white-label/multi-tenant needs. | Low |
| Dashboard widgets | Add widget visibility and ordering once report modules grow. | Medium |

Important constraint:

- Hiding a navigation item must not be treated as authorization. API routes and services must still enforce role and feature access.

## Suggested Feature Flags

| Flag | Default | Affected areas |
| --- | --- | --- |
| `catalog.enabled` | true | Product/category admin and POS product lookup |
| `inventory.enabled` | true | Inventory dashboard, stock validation, recipe management |
| `kitchen.enabled` | true | Kitchen route, kitchen status creation, kitchen API |
| `queue.enabled` | true | Queue route, queue number display |
| `accounting.enabled` | true | Accounting dashboard, journal creation, accounting reports |
| `reporting.enabled` | true | Dashboard report APIs and widgets |
| `payments.cash.enabled` | true | Cash checkout |
| `payments.qris.enabled` | false | QRIS checkout and provider callbacks |
| `refunds.enabled` | false | Refund UI/API workflow |
| `receipts.printing.enabled` | true | Print actions and receipt rendering |

Core auth, users, audit logging, and settings should not be fully disabled because other modules depend on them.

## Module Enablement Behavior

Module configuration should control whether a module is available in the product. It should not only hide menu links. Each module flag needs consistent behavior across navigation, pages, API routes, services, and automatic side effects.

| Module | Can be disabled? | Disable behavior |
| --- | --- | --- |
| Authentication | No | Required for protected pages, API authorization, audit attribution, and role checks. |
| Admin users | No for MVP | Required so admins can manage access. Individual users can still be deactivated. |
| Settings | No | Required as the central place to manage store and module configuration. |
| Catalog | Usually no | Checkout depends on products and categories. A very limited deployment could hide catalog admin, but product reads are still required. |
| Checkout/POS | Usually no | This is the core POS workflow. If disabled, most operational value is removed. |
| Payments: cash | Yes, if another payment method is enabled | Hide cash checkout and reject cash payment APIs. At least one payment method should remain enabled. |
| Payments: QRIS | Yes | Hide QRIS actions and reject QRIS APIs/callback flows unless configured. |
| Receipt printing | Yes | Hide print actions but keep receipt viewing and historical order data available. |
| Inventory | Yes | Hide inventory dashboard and stock movement pages. Disable recipe/ingredient stock validation and stock deduction only if the store intentionally runs without inventory tracking. Product-level `trackStock` should be ignored or blocked from use when inventory is disabled. |
| Kitchen | Yes | Hide kitchen page/API. Paid checkout should not assign `kitchenStatus` when disabled. |
| Queue | Yes | Hide queue page/API. Paid checkout should not assign queue numbers when disabled unless kitchen still needs queue tickets. |
| Reporting | Yes | Hide dashboard report widgets and reject report APIs. Operational transaction history should remain available through order pages. |
| Accounting | Yes | Hide accounting dashboard/API. Disable automatic journal and cash ledger creation from checkout, expenses, cash movements, and daily close. Keep POS order/payment records unchanged. |
| Refunds | Yes | Hide refund actions and reject refund APIs. Existing refund schema can remain unused. |

Important implementation rule:

- A disabled module should reject new module-specific mutations, but existing historical data should remain readable where another enabled workflow depends on it.

Example outcomes:

| Desired setup | Required settings | Expected behavior |
| --- | --- | --- |
| POS without accounting | `accounting.enabled = false` | Checkout still creates orders and payments, but does not create journal entries or cash ledger entries. Accounting pages and APIs are unavailable. |
| POS without inventory | `inventory.enabled = false` | Checkout does not validate ingredient recipes or create stock movements. Inventory pages and stock APIs are unavailable. Product catalog and checkout still work. |
| Simple cashier-only store | `inventory.enabled = false`, `kitchen.enabled = false`, `queue.enabled = false`, `accounting.enabled = false`, `reporting.enabled = false` | App behaves as basic catalog, checkout, payment, receipt, and order history system. |
| Kitchen-enabled store without public queue display | `kitchen.enabled = true`, `queue.enabled = false` | Kitchen board works, public queue page is unavailable. Queue number assignment depends on whether kitchen tickets require visible numbers. |

## Suggested Setting Fields

High-priority fields to add next:

| Setting | Type | Scope | Reason |
| --- | --- | --- | --- |
| `currencyCode` | string | Store | Standardizes money formatting and future multi-currency assumptions. |
| `locale` | string | Store | Controls date, number, and receipt formatting. |
| `timeZone` | string | Store | Removes hard-coded `Asia/Jakarta` from queue and reporting logic. |
| `businessDayStartTime` | string | Store | Supports stores operating past midnight. |
| `cashPaymentEnabled` | boolean | Checkout/payment | Allows payment method control. |
| `qrisPaymentEnabled` | boolean | Checkout/payment | Prepares QRIS activation without code changes. |
| `kitchenEnabled` | boolean | Kitchen | Allows stores without preparation flow. |
| `queueEnabled` | boolean | Queue | Allows disabling public queue display. |
| `inventoryEnabled` | boolean | Inventory | Allows simpler POS deployments. |
| `accountingEnabled` | boolean | Accounting | Allows operational POS without accounting screens. |
| `maxOrderDiscountAmount` | decimal/null | Checkout | Controls discount risk. |
| `maxItemDiscountAmount` | decimal/null | Checkout | Controls item-level discount risk. |
| `cashRoundingIncrement` | decimal/null | Payment | Supports cash denomination rounding. |
| `defaultCashAccountCode` | string | Accounting | Removes hard-coded account mapping. |
| `defaultSalesAccountCode` | string | Accounting | Removes hard-coded account mapping. |
| `defaultTaxPayableAccountCode` | string | Accounting | Removes hard-coded account mapping. |
| `defaultServiceChargeAccountCode` | string | Accounting | Removes hard-coded account mapping. |
| `defaultVarianceAccountCode` | string | Accounting | Removes hard-coded account mapping. |

## Implementation Priority

### Phase 1: Shared Store Configuration

- Add `currencyCode`, `locale`, `timeZone`, and `businessDayStartTime`.
- Replace hard-coded `Asia/Jakarta` in queue and reporting/accounting date defaults.
- Add tests for business-date calculations.

### Phase 2: Module And Payment Toggles

- Add feature flags for kitchen, queue, inventory, accounting, reporting, cash payment, and QRIS payment.
- Enforce flags in API routes/services, not only navigation.
- Hide disabled module routes and dashboard links.
- Keep data integrity behavior stable when a module is disabled.

### Phase 3: Checkout Policy

- Add discount limits, cash rounding, hold/cancel policy, and product/category kitchen routing.
- Snapshot applied configuration onto orders where it affects historical totals or receipts.
- Add tests for limit validation and rounding behavior.

### Phase 4: Accounting Mappings

- Replace hard-coded default account codes with configurable mappings.
- Add validation that mapped accounts exist, are active, and have compatible account types.
- Audit all mapping changes.

### Phase 5: Receipt And Reporting Customization

- Add receipt field visibility, paper size, print behavior, dashboard widget visibility, and report limits.
- Keep report calculations server-authoritative.

## Configuration Risk Areas

| Risk | Mitigation |
| --- | --- |
| Feature flag hides UI but API still mutates data | Enforce flags in route handlers/services. |
| Changing tax/service settings alters historical receipts | Snapshot calculated amounts and display labels on orders/receipts where needed. |
| Accounting account mapping creates invalid journals | Validate account type and active state before saving mappings. |
| Business timezone change shifts reports unexpectedly | Show warning before saving and use business-date snapshots for orders. |
| Module disabled after data exists | Disable new mutations but keep historical read access where operationally necessary. |
| Overusing JSON settings creates weak validation | Prefer typed columns for high-risk money, stock, auth, and accounting settings. |

## Summary

The strongest immediate configurability candidates are store locale/timezone, module toggles, payment method enablement, checkout discount policy, kitchen/queue enablement, and accounting account mappings.

The current `AppSetting` model is a good MVP starting point, but high-risk domains should use typed fields and service-level validation rather than broad JSON configuration.
