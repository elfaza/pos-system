# 13 - Test Case Matrix

## Purpose

This document defines test cases for the POS system by function, module flow, configuration behavior, and edge cases.

Use this as the source document for Vitest unit tests, route/API tests, integration tests, end-to-end tests, and manual QA scripts.

## Test Case Format

| Field | Meaning |
| --- | --- |
| ID | Stable identifier for tracking test implementation |
| Context | Preconditions, actor, data, or configuration |
| Action | Operation under test |
| Expected result | Required behavior |
| Type | Unit, integration, API, E2E, or manual |

## Global Configuration Test Cases

These tests cover configurable modules and settings. They should be implemented before or alongside the module configuration work described in [12-configurability-analysis.md](12-configurability-analysis.md).

### Module Enablement

| ID | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- |
| CFG-MOD-001 | `accounting.enabled = false`, admin authenticated | Open accounting dashboard route | Route is unavailable or redirects with clear disabled-module behavior. | E2E |
| CFG-MOD-002 | `accounting.enabled = false`, admin authenticated | Call accounting API route | API rejects with disabled-module response and does not mutate accounting records. | API |
| CFG-MOD-003 | `accounting.enabled = false`, cashier completes paid cash checkout | Finalize checkout | Order and payment are created; journal entries and cash ledger entries are not created. | Integration |
| CFG-MOD-004 | `accounting.enabled = true`, cashier completes paid cash checkout | Finalize checkout | Order, payment, balanced journal entry, and cash ledger entry are created. | Integration |
| CFG-MOD-005 | `inventory.enabled = false`, product has recipe rows | Finalize checkout | Checkout does not validate ingredient stock or create stock movements. | Integration |
| CFG-MOD-006 | `inventory.enabled = true`, product has recipe rows and insufficient stock | Finalize checkout | Checkout is rejected for insufficient ingredient stock. | Integration |
| CFG-MOD-007 | `inventory.enabled = false`, admin authenticated | Open inventory dashboard | Inventory page is unavailable or hidden from navigation. | E2E |
| CFG-MOD-008 | `inventory.enabled = false`, admin authenticated | Call ingredient or stock movement mutation API | API rejects with disabled-module response. | API |
| CFG-MOD-009 | `kitchen.enabled = false` | Finalize paid checkout | Order is paid without kitchen status assignment. | Integration |
| CFG-MOD-010 | `kitchen.enabled = false`, kitchen user/admin authenticated | Call kitchen order list/status API | API rejects with disabled-module response. | API |
| CFG-MOD-011 | `kitchen.enabled = true` | Finalize paid checkout | Order gets initial kitchen status according to configured workflow. | Integration |
| CFG-MOD-012 | `queue.enabled = false` | Open public queue page | Queue page is unavailable or hidden. | E2E |
| CFG-MOD-013 | `queue.enabled = false`, `kitchen.enabled = false` | Finalize checkout | No queue number is assigned. | Integration |
| CFG-MOD-014 | `queue.enabled = false`, `kitchen.enabled = true` | Finalize checkout | Behavior follows configured kitchen ticket policy; queue display remains unavailable. | Integration |
| CFG-MOD-015 | `reporting.enabled = false`, admin authenticated | Call dashboard report API | API rejects with disabled-module response. | API |
| CFG-MOD-016 | `reporting.enabled = false`, admin authenticated | Open dashboard | Report widgets are hidden or replaced by disabled-module state. | E2E |
| CFG-MOD-017 | `receipts.printing.enabled = false` | Complete checkout and view receipt | Receipt is viewable; print action is hidden or disabled. | E2E |
| CFG-MOD-018 | Core auth/settings modules | Attempt to disable auth or settings | System rejects invalid configuration. | Unit/API |
| CFG-MOD-019 | All optional modules disabled | Cashier opens POS | Catalog, checkout, cash payment, receipt view, and order history still work. | E2E |
| CFG-MOD-020 | Module disabled after historical records exist | Read historical order/report-dependent data | Existing operational records remain readable where needed. | Integration |

### Payment Configuration

| ID | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- |
| CFG-PAY-001 | `payments.cash.enabled = true` | Submit cash checkout | Cash checkout succeeds when payment input is valid. | Integration |
| CFG-PAY-002 | `payments.cash.enabled = false`, QRIS enabled | Submit cash checkout | Cash checkout is rejected; no order/payment is created. | API |
| CFG-PAY-003 | `payments.cash.enabled = false`, QRIS disabled | Save settings | Settings validation rejects disabling all payment methods. | API |
| CFG-PAY-004 | `payments.qris.enabled = false` | Attempt QRIS checkout or callback | QRIS action is rejected. | API |
| CFG-PAY-005 | Cash rounding increment configured | Submit cash checkout with total requiring rounding | Payable amount and change follow configured rounding rule. | Unit/Integration |
| CFG-PAY-006 | Payment provider credentials missing | Enable provider-backed QRIS | Settings validation rejects or marks provider unavailable. | API |

### Store, Locale, And Business Date Configuration

| ID | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- |
| CFG-STORE-001 | Valid `timeZone` configured | Generate queue business date | Business date uses configured timezone. | Unit |
| CFG-STORE-002 | Invalid `timeZone` submitted | Save settings | Settings validation rejects invalid timezone. | API |
| CFG-STORE-003 | `businessDayStartTime` configured after midnight | Checkout before cutoff | Order business date maps to previous configured business date. | Unit/Integration |
| CFG-STORE-004 | `currencyCode = IDR`, `locale = id-ID` | Render money values | Values use configured currency and locale. | Unit/E2E |
| CFG-STORE-005 | Change timezone after orders exist | Load old order receipt | Historical order date/amount snapshots remain stable. | Integration |
| CFG-STORE-006 | Tax inclusive mode configured | Calculate checkout totals | Tax calculation follows inclusive mode and persisted totals match. | Unit/Integration |
| CFG-STORE-007 | Tax exclusive mode configured | Calculate checkout totals | Tax calculation follows exclusive mode. | Unit/Integration |
| CFG-STORE-008 | Service charge enabled with positive rate | Calculate checkout totals | Service charge amount is applied once. | Unit |
| CFG-STORE-009 | Service charge disabled with saved rate | Calculate checkout totals | Saved rate is ignored while disabled. | Unit |
| CFG-STORE-010 | Store profile fields configured | Render receipt | Receipt shows configured store name, phone, address, logo, and footer. | E2E |

### Checkout Policy Configuration

| ID | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- |
| CFG-CHK-001 | Max item discount configured | Submit item discount below limit | Checkout accepts item. | Integration |
| CFG-CHK-002 | Max item discount configured | Submit item discount above limit | Checkout rejects item discount. | Integration |
| CFG-CHK-003 | Max order discount configured | Submit aggregate discount above limit | Checkout rejects checkout. | Integration |
| CFG-CHK-004 | Hold orders disabled | Submit hold order | Hold API rejects request. | API |
| CFG-CHK-005 | Hold orders enabled | Submit valid hold order | Held order is created without payment or stock deduction. | Integration |
| CFG-CHK-006 | Cancel window configured | Cancel eligible held order within window | Order is cancelled. | Integration |
| CFG-CHK-007 | Cancel window expired | Cancel old order | Cancel is rejected. | Integration |
| CFG-CHK-008 | Product/category `sendToKitchen = false` | Checkout product | Order does not appear on kitchen board for that item/category. | Integration |
| CFG-CHK-009 | Product/category `sendToKitchen = true` | Checkout product | Order appears on kitchen board when kitchen is enabled. | Integration |

### Accounting Configuration

| ID | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- |
| CFG-ACC-001 | Valid default account mappings | Create paid cash order | Journal uses configured cash, sales, tax, and service charge accounts. | Integration |
| CFG-ACC-002 | Cash account mapping points to inactive account | Save settings | Settings validation rejects mapping. | API |
| CFG-ACC-003 | Sales account mapping points to asset account | Save settings | Settings validation rejects incompatible account type. | API |
| CFG-ACC-004 | Auto-create default accounts disabled and mappings missing | Create accounting-triggering event | Service rejects with account configuration error. | Integration |
| CFG-ACC-005 | Journal numbering prefix configured | Create journal entry | Entry number uses configured prefix. | Integration |
| CFG-ACC-006 | Daily close required before next business day | Attempt next-day checkout with previous day open | Behavior follows configured rule: reject checkout or warn based on policy. | E2E |
| CFG-ACC-007 | Variance account configured | Create daily close with difference | Variance journal uses configured account. | Integration |

## Function-Level Test Cases

### Shared Libraries

| ID | Function | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- | --- |
| LIB-ENV-001 | `getDatabaseUrl` | `DATABASE_URL` exists | Call function | Returns configured database URL. | Unit |
| LIB-ENV-002 | `getDatabaseUrl` | `DATABASE_URL` missing | Call function | Throws configuration error. | Unit |
| LIB-ENV-003 | `getAuthSessionDays` | Valid positive env value | Call function | Returns configured day count. | Unit |
| LIB-ENV-004 | `getAuthSessionDays` | Missing env value | Call function | Returns safe default. | Unit |
| LIB-ENV-005 | `getAuthSessionDays` | Invalid or negative env value | Call function | Returns default or rejects based on env contract. | Unit |
| LIB-NUM-001 | `toDecimalString` | Numeric, string, empty, null inputs | Convert value | Returns normalized decimal string or fallback. | Unit |
| LIB-NUM-002 | `toOptionalDecimalString` | Empty/null input | Convert value | Returns null. | Unit |
| LIB-NUM-003 | `toOptionalDecimalString` | Valid decimal input | Convert value | Returns decimal string. | Unit |
| LIB-NUM-004 | `toBoolean` | Boolean and string-like values | Convert value | Returns expected boolean. | Unit |
| LIB-NUM-005 | `toInteger` | Decimal string, invalid string, null | Convert value | Returns integer or fallback. | Unit |
| LIB-NUM-006 | `sanitizeDecimalInput` | Currency text with invalid characters | Sanitize input | Keeps valid decimal representation only. | Unit |
| LIB-CUR-001 | `formatCurrencyInput` | Number/string/null | Format value | Returns display-safe currency input text. | Unit |
| LIB-CUR-002 | `parseCurrencyInput` | Formatted money string | Parse value | Returns normalized numeric string. | Unit |
| LIB-API-001 | `jsonOk` | Data object | Build response | Returns success JSON response. | Unit |
| LIB-API-002 | `jsonError` | Validation error | Build response | Returns validation status and field errors. | Unit |
| LIB-API-003 | `jsonError` | Unknown error | Build response | Returns safe generic error. | Unit |
| LIB-API-004 | `readJsonObject` | Valid JSON object request | Read body | Returns object. | Unit |
| LIB-API-005 | `readJsonObject` | Invalid JSON or non-object body | Read body | Throws validation error. | Unit |

### Authentication

| ID | Function | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- | --- |
| AUTH-001 | `hashPassword`/`verifyPassword` | Plain password | Hash then verify | Verification succeeds for original password. | Unit |
| AUTH-002 | `verifyPassword` | Wrong password | Verify | Verification fails. | Unit |
| AUTH-003 | `createSessionToken` | No input | Create token | Token is non-empty and unique across calls. | Unit |
| AUTH-004 | `hashSessionToken` | Same token twice | Hash token | Hashes are deterministic and do not equal raw token. | Unit |
| AUTH-005 | `getSessionExpiresAt` | Session days configured | Call function | Expiry is now plus configured duration. | Unit |
| AUTH-006 | `loginRequest` | Active user, correct password | Login | Session is created, last login updated, activity log written. | Integration |
| AUTH-007 | `loginRequest` | Unknown email | Login | Invalid credentials error. | Integration |
| AUTH-008 | `loginRequest` | Inactive user | Login | Invalid credentials error. | Integration |
| AUTH-009 | `loginRequest` | Missing database config | Login | Configuration error. | Unit/Integration |
| AUTH-010 | `getUserBySessionToken` | Valid active session | Resolve user | Returns auth user without password hash. | Integration |
| AUTH-011 | `getUserBySessionToken` | Revoked session | Resolve user | Returns null. | Integration |
| AUTH-012 | `getUserBySessionToken` | Expired session | Resolve user | Returns null. | Integration |
| AUTH-013 | `logoutRequest` | Existing active session | Logout | Session is revoked and activity log written. | Integration |
| AUTH-014 | `logoutRequest` | Missing/revoked session | Logout | No error and no unsafe mutation. | Integration |
| AUTH-015 | `requireUser` | User has allowed role | Require user | Returns user. | Integration |
| AUTH-016 | `requireUser` | Missing session | Require user | Rejects as unauthorized. | Integration/API |
| AUTH-017 | `requireUser` | Role not allowed | Require user | Rejects as forbidden. | Integration/API |
| AUTH-018 | `createUserFromPayload` | Valid admin payload | Create user | User is created with hashed password. | Integration |
| AUTH-019 | `createUserFromPayload` | Duplicate email | Create user | Request is rejected. | Integration |
| AUTH-020 | `updateUserFromPayload` | Valid update | Update user | Name, role, active state, and optional password update persist. | Integration |
| AUTH-021 | `updateUserFromPayload` | Nonexistent user | Update user | Not found error. | Integration |

### Catalog And Settings

| ID | Function | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- | --- |
| CAT-001 | `getCategoryList` | Active and inactive categories exist | List without inactive | Returns active categories only. | Integration |
| CAT-002 | `getCategoryList` | Active and inactive categories exist | List with inactive | Returns both active and inactive categories. | Integration |
| CAT-003 | `createCategoryFromPayload` | Valid name/sort payload | Create category | Category is created with unique slug. | Integration |
| CAT-004 | `createCategoryFromPayload` | Empty name | Create category | Validation error. | Unit/Integration |
| CAT-005 | `updateCategoryFromPayload` | Existing category | Update category | Category fields update and slug remains valid. | Integration |
| CAT-006 | `updateCategoryFromPayload` | Nonexistent category | Update category | Not found error. | Integration |
| CAT-007 | `getProductList` | Available/unavailable products | List for cashier | Returns only visible products according to include flag. | Integration |
| CAT-008 | `getProductList` | Search/category filters | List products | Returns filtered products within limit. | Integration |
| CAT-009 | `getProductListLimit` | No context | Call function | Returns configured/static list limit. | Unit |
| CAT-010 | `getVariantLimit` | Many variants in payload | Parse limit | Enforces variant limit. | Unit |
| CAT-011 | `createProductFromPayload` | Valid product with variants/recipes | Create product | Product, variants, and recipe rows are created. | Integration |
| CAT-012 | `createProductFromPayload` | Missing category | Create product | Validation error. | Integration |
| CAT-013 | `createProductFromPayload` | Negative price | Create product | Validation error. | Unit/Integration |
| CAT-014 | `createProductFromPayload` | Invalid recipe quantity | Create product | Validation error. | Unit/Integration |
| CAT-015 | `updateProductFromPayload` | Existing product | Update product | Product, variants, and recipes update transactionally. | Integration |
| CAT-016 | `updateProductFromPayload` | Nonexistent product | Update product | Not found error. | Integration |
| CAT-017 | `getAppSettings` | Settings row exists | Load settings | Returns mapped settings record. | Integration |
| CAT-018 | `updateSettingsFromPayload` | Valid store/tax/service payload | Save settings | Settings update and activity log is written. | Integration |
| CAT-019 | `updateSettingsFromPayload` | Empty store name | Save settings | Validation error. | Unit/Integration |
| CAT-020 | `updateSettingsFromPayload` | Negative tax/service/refund window | Save settings | Field validation errors. | Unit/Integration |

### Checkout

| ID | Function | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- | --- |
| CHK-001 | `calculateCartTotals` | Empty items | Calculate | Totals are zero. | Unit |
| CHK-002 | `calculateCartTotals` | Multiple items and discounts | Calculate | Subtotal, discount, tax, service, and total are correct. | Unit |
| CHK-003 | `calculateCartTotals` | Tax disabled, service enabled | Calculate | Only service is applied. | Unit |
| CHK-004 | `calculateCartTotals` | Tax enabled, service disabled | Calculate | Only tax is applied. | Unit |
| CHK-005 | `formatRupiah` | Numeric value | Format | Returns expected Rupiah display string. | Unit |
| CHK-006 | `createOrderNumber` | Fixed date | Create number | Prefix/timestamp format is stable. | Unit |
| CHK-007 | `parseCashCheckoutPayload` | Valid payload | Parse | Returns normalized checkout input. | Unit |
| CHK-008 | `parseCashCheckoutPayload` | Empty items | Parse | Validation error. | Unit |
| CHK-009 | `parseCashCheckoutPayload` | Invalid quantity/discount/cash | Parse | Field validation errors. | Unit |
| CHK-010 | `parseHoldOrderPayload` | Valid payload | Parse | Returns normalized held-order input. | Unit |
| CHK-011 | `finalizeCashCheckout` | Valid cart, exact cash | Finalize | Paid order, items, payment, queue/kitchen, stock, and accounting side effects are created according to config. | Integration |
| CHK-012 | `finalizeCashCheckout` | Cash received below total | Finalize | Validation error and no mutation. | Integration |
| CHK-013 | `finalizeCashCheckout` | Unavailable product/category | Finalize | Validation error. | Integration |
| CHK-014 | `finalizeCashCheckout` | Inactive variant | Finalize | Validation error. | Integration |
| CHK-015 | `finalizeCashCheckout` | Product stock insufficient | Finalize | Validation error. | Integration |
| CHK-016 | `finalizeCashCheckout` | Ingredient stock insufficient | Finalize | Validation error. | Integration |
| CHK-017 | `finalizeCashCheckout` | Overpaid cash | Finalize | Change amount is persisted. | Integration |
| CHK-018 | `holdOrder` | Valid cart | Hold order | Held order is created without payment, stock deduction, kitchen status, or accounting side effects. | Integration |
| CHK-019 | `getHeldOrders` | Cashier actor | List held orders | Returns only cashier-owned held orders. | Integration |
| CHK-020 | `getHeldOrders` | Admin actor | List held orders | Returns all held orders according to repository rules. | Integration |
| CHK-021 | `getHeldOrder` | Authorized actor | Load held order | Returns held order detail. | Integration |
| CHK-022 | `getHeldOrder` | Unauthorized cashier | Load another cashier held order | Not found or forbidden behavior. | Integration |
| CHK-023 | `parseOrderStatusFilter` | Valid status | Parse | Returns status. | Unit |
| CHK-024 | `parseOrderStatusFilter` | Invalid status | Parse | Validation error. | Unit |
| CHK-025 | `parsePaymentMethodFilter` | Valid method | Parse | Returns payment method. | Unit |
| CHK-026 | `parsePaymentStatusFilter` | Valid status | Parse | Returns payment status. | Unit |
| CHK-027 | `parsePaymentDateFilter` | Valid date | Parse | Returns date range boundary. | Unit |
| CHK-028 | `parsePaymentDateFilter` | Invalid date | Parse | Validation error. | Unit |
| CHK-029 | `getOrders` | Cashier actor and filters | List orders | Returns only authorized matching orders. | Integration |
| CHK-030 | `getOrder` | Existing authorized order | Load order | Returns mapped checkout order. | Integration |
| CHK-031 | `cancelOrder` | Held or unpaid eligible order | Cancel | Order status becomes cancelled and audit is written. | Integration |
| CHK-032 | `cancelOrder` | Paid order | Cancel | Cancellation follows configured eligibility, default rejects unsafe cancellation. | Integration |

### Inventory

| ID | Function | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- | --- |
| INV-001 | `getIngredientList` | Search and active filters | List ingredients | Returns filtered ingredients. | Integration |
| INV-002 | `getLowStockIngredientCount` | Low and normal stock exist | Count | Returns low-stock count. | Integration |
| INV-003 | `createIngredientFromPayload` | Valid payload | Create ingredient | Ingredient is created and audit log written. | Integration |
| INV-004 | `createIngredientFromPayload` | Empty name/unit | Create ingredient | Validation error. | Unit/Integration |
| INV-005 | `createIngredientFromPayload` | Negative stock/threshold | Create ingredient | Validation error. | Unit/Integration |
| INV-006 | `updateIngredientFromPayload` | Existing ingredient | Update | Editable fields update without directly changing stock. | Integration |
| INV-007 | `updateIngredientFromPayload` | Nonexistent ingredient | Update | Not found error. | Integration |
| INV-008 | `adjustIngredientFromPayload` | Increase adjustment | Adjust | Stock increases and movement is created. | Integration |
| INV-009 | `adjustIngredientFromPayload` | Decrease adjustment within stock | Adjust | Stock decreases and movement is created. | Integration |
| INV-010 | `adjustIngredientFromPayload` | Waste decrease | Adjust | Stock decreases with waste movement. | Integration |
| INV-011 | `adjustIngredientFromPayload` | Waste increase | Adjust | Validation error. | Unit/Integration |
| INV-012 | `adjustIngredientFromPayload` | Decrease below zero | Adjust | Validation error and no stock mutation. | Integration |
| INV-013 | `getStockMovementList` | Valid filters | List movements | Returns matching movement records. | Integration |
| INV-014 | `getStockMovementList` | Invalid movement type | List movements | Validation error. | Unit/Integration |
| INV-015 | `getIngredientStockStatus` | Out, low, ok, inactive rows | Map status | Returns expected stock status. | Unit |
| INV-016 | `mapIngredient` | Ingredient row | Map | Decimal fields become numbers and shape matches type. | Unit |
| INV-017 | `mapProductIngredient` | Recipe row | Map | Product ingredient response is normalized. | Unit |
| INV-018 | `mapStockMovement` | Movement row | Map | Movement response includes product/ingredient/user context. | Unit |

### Kitchen And Queue

| ID | Function | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- | --- |
| KIT-001 | `getQueueBusinessDate` | Fixed date and timezone | Compute date | Returns expected business date. | Unit |
| KIT-002 | `getQueueBusinessDate` | Date near UTC day boundary | Compute date | Uses configured timezone, not server timezone. | Unit |
| KIT-003 | `getNextQueueNumber` | Existing queue numbers for business date | Compute next | Returns max plus one. | Integration |
| KIT-004 | `getNextQueueNumber` | No existing queue numbers | Compute next | Returns 1. | Integration |
| KIT-005 | `parseKitchenStatus` | Valid status | Parse | Returns status. | Unit |
| KIT-006 | `parseKitchenStatus` | Invalid status | Parse | Validation error. | Unit |
| KIT-007 | `getKitchenBoard` | Active paid orders exist | Load board | Groups/maps active kitchen orders. | Integration |
| KIT-008 | `getQueueDisplay` | Ready queue orders exist | Load display | Returns queue display model. | Integration |
| KIT-009 | `changeKitchenStatus` | received -> preparing | Change status | Status and preparing timestamp update, audit log written. | Integration |
| KIT-010 | `changeKitchenStatus` | received -> ready | Change status | Status and ready timestamp update. | Integration |
| KIT-011 | `changeKitchenStatus` | preparing -> ready | Change status | Status transition succeeds. | Integration |
| KIT-012 | `changeKitchenStatus` | ready -> completed | Change status | Status transition succeeds and completed timestamp set. | Integration |
| KIT-013 | `changeKitchenStatus` | ready -> preparing | Change status | Validation error for backward transition. | Integration |
| KIT-014 | `changeKitchenStatus` | unpaid order | Change status | Validation error. | Integration |
| KIT-015 | `changeKitchenStatus` | missing order | Change status | Not found error. | Integration |
| KIT-016 | `mapKitchenOrder` | Complete kitchen row | Map | Returns normalized kitchen order. | Unit |
| KIT-017 | `buildKitchenBoard` | Received/preparing/ready orders | Build board | Orders are grouped into expected board columns. | Unit |
| KIT-018 | `buildQueueDisplay` | Active queue orders | Build display | Waiting/preparing/ready display groups are correct. | Unit |

### Reporting

| ID | Function | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- | --- |
| REP-001 | `parseReportDateRange` | No query params | Parse | Defaults to current business date. | Unit |
| REP-002 | `parseReportDateRange` | Valid date range | Parse | Returns inclusive date labels and exclusive end Date. | Unit |
| REP-003 | `parseReportDateRange` | Invalid date format | Parse | Validation error. | Unit |
| REP-004 | `parseReportDateRange` | End before start | Parse | Validation error. | Unit |
| REP-005 | `parseReportDateRange` | Range exceeds configured/static max | Parse | Validation error. | Unit |
| REP-006 | `getDashboardReport` | Paid orders exist | Build report | Sales totals include paid orders. | Integration |
| REP-007 | `getDashboardReport` | Draft/held/cancelled orders exist | Build report | Excluded statuses do not affect paid sales totals. | Integration |
| REP-008 | `getDashboardReport` | Refund records exist | Build report | Net sales and refund values account for refunds. | Integration |
| REP-009 | `getDashboardReport` | Product names changed after sale | Build report | Top products use order item snapshots. | Integration |
| REP-010 | `getDashboardReport` | Low/out stock rows exist | Build report | Stock summary status counts are correct. | Integration |
| REP-011 | `getDashboardReport` | Multiple cashiers | Build report | Cashier report groups and sorts correctly. | Integration |
| REP-012 | Dashboard report route | Cashier actor | Call API | Forbidden response. | API |
| REP-013 | Dashboard report route | Admin actor | Call API | Success response with dashboard report. | API |

### Accounting

| ID | Function | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- | --- |
| ACC-001 | `createSalesAccountingForPaidCashOrder` | Paid cash order totals | Create accounting | Balanced journal and cash ledger entry are created. | Integration |
| ACC-002 | `createSalesAccountingForPaidCashOrder` | Called twice for same order | Create accounting | Idempotent journal behavior; no duplicate source journal. | Integration |
| ACC-003 | `createSalesAccountingForPaidCashOrder` | Tax and service amounts zero | Create accounting | Tax/service lines are omitted and entry still balances. | Integration |
| ACC-004 | `getAccountsAndCategories` | Empty accounting setup | Load setup | Default accounts/categories exist or are created according to config. | Integration |
| ACC-005 | `createAccountFromPayload` | Valid account payload | Create account | Account is created. | Integration |
| ACC-006 | `createAccountFromPayload` | Invalid account type | Create account | Validation error. | Unit/Integration |
| ACC-007 | `createAccountFromPayload` | Missing code/name | Create account | Validation error. | Unit/Integration |
| ACC-008 | `updateAccountFromPayload` | Existing account | Update account | Name and active state update. | Integration |
| ACC-009 | `updateAccountFromPayload` | Nonexistent account | Update account | Not found error. | Integration |
| ACC-010 | `getJournalEntryList` | More than 100 entries | List entries | Returns latest 100 with lines/accounts. | Integration |
| ACC-011 | `getExpenseList` | Expenses exist | List expenses | Returns latest expenses with category. | Integration |
| ACC-012 | `createExpenseFromPayload` | Valid cash expense | Create expense | Expense, journal, cash ledger, and audit log are created. | Integration |
| ACC-013 | `createExpenseFromPayload` | Valid QRIS expense | Create expense | Expense and journal are created; cash ledger behavior follows payment source. | Integration |
| ACC-014 | `createExpenseFromPayload` | Missing description | Create expense | Validation error. | Unit/Integration |
| ACC-015 | `createExpenseFromPayload` | Invalid category | Create expense | Validation error. | Integration |
| ACC-016 | `createCashMovementFromPayload` | Cash in | Create movement | Movement, journal, ledger, and audit log are created. | Integration |
| ACC-017 | `createCashMovementFromPayload` | Cash out | Create movement | Movement, journal, ledger, and audit log are created with out direction. | Integration |
| ACC-018 | `createCashMovementFromPayload` | Missing reason or invalid amount | Create movement | Validation error. | Unit/Integration |
| ACC-019 | `getDailyCloseList` | Closes exist | List closes | Returns latest closes sorted by business date. | Integration |
| ACC-020 | `createDailyCloseFromPayload` | No previous close, cash matches expected | Close day | Close is created with zero difference and no variance journal. | Integration |
| ACC-021 | `createDailyCloseFromPayload` | Positive cash difference | Close day | Close and variance journal/ledger are created. | Integration |
| ACC-022 | `createDailyCloseFromPayload` | Negative cash difference | Close day | Close and variance journal/ledger are created. | Integration |
| ACC-023 | `createDailyCloseFromPayload` | Duplicate business date | Close day | Validation error. | Integration |
| ACC-024 | `getAccountingReport` | Valid date range | Load report | Ledger, journal, close, income, expense, and cash summaries are correct. | Integration |
| ACC-025 | `getAccountingReport` | Invalid date range | Load report | Validation error. | Unit/Integration |
| ACC-026 | Accounting API routes | Cashier actor | Call route | Forbidden response. | API |
| ACC-027 | Accounting API routes | Admin actor | Call route | Authorized response for valid request. | API |

### Client State, Actions, And Repositories

These functions mostly support service flows. Test them directly where they contain filtering, limits, persistence boundaries, or user-visible state transitions.

| ID | Surface | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- | --- |
| SUP-001 | `useCartStore` | Empty cart | Add product item | Cart contains one normalized line item. | Unit |
| SUP-002 | `useCartStore` | Existing same product/variant line | Add same item again | Quantity increments without duplicate line unless notes/variant require separate line behavior. | Unit |
| SUP-003 | `useCartStore` | Existing cart item | Update quantity | Quantity updates and invalid quantities are guarded. | Unit |
| SUP-004 | `useCartStore` | Existing cart item | Apply item discount | Discount is persisted in cart state. | Unit |
| SUP-005 | `useCartStore` | Existing cart item | Remove item | Item is removed and totals update in UI. | Unit |
| SUP-006 | `useCartStore` | Existing cart | Clear cart | Cart returns to initial empty state. | Unit |
| SUP-007 | Auth server actions | Valid login payload | Call `login` action | Session cookie is set and user result is returned. | Integration |
| SUP-008 | Auth server actions | Invalid login payload | Call `login` action | Safe error result is returned and no session cookie is set. | Integration |
| SUP-009 | Auth server actions | Active session | Call `logout` action | Session is revoked and cookie is cleared. | Integration |
| SUP-010 | Auth server actions | Active session | Call `getUser` action | Current user is returned. | Integration |
| SUP-011 | Repository list limits | More rows than limit exist | Call list repository function | Result count never exceeds repository limit. | Integration |
| SUP-012 | User repository | Existing users | List users | Users are ordered and password hashes are not selected by service response. | Integration |
| SUP-013 | Category repository | Include inactive false | List categories | Inactive categories are excluded. | Integration |
| SUP-014 | Product repository | Search/category/availability filters | List products | Filters are translated correctly to Prisma query behavior. | Integration |
| SUP-015 | Order repository | Cashier actor | List orders/held orders | Results are scoped to cashier ownership where required. | Integration |
| SUP-016 | Order repository | Admin actor | List orders/held orders | Admin visibility follows product rules. | Integration |
| SUP-017 | Inventory repository | Concurrent stock adjustment | Adjust stock | Transaction prevents negative stock and writes one movement per successful adjustment. | Integration |
| SUP-018 | Kitchen repository | Active and completed kitchen orders exist | List active kitchen orders | Completed orders are excluded from active board. | Integration |
| SUP-019 | Reporting repository | Paid date range filters | List report orders | Query includes paid orders within date range only. | Integration |
| SUP-020 | Settings repository | Missing settings row | Get settings | Default settings row is created or returned according to repository contract. | Integration |

## Module Flow Test Cases

### Authentication Flow

| ID | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- |
| FLOW-AUTH-001 | Admin credentials seeded | Login | Admin lands on dashboard and session cookie is set. | E2E |
| FLOW-AUTH-002 | Cashier credentials seeded | Login | Cashier lands on POS and session cookie is set. | E2E |
| FLOW-AUTH-003 | Cashier session | Open admin dashboard | Access is blocked. | E2E |
| FLOW-AUTH-004 | Authenticated user | Logout | Session is revoked and protected pages require login. | E2E |

### Catalog Setup Flow

| ID | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- |
| FLOW-CAT-001 | Admin session | Create category, product, variant | Product appears in admin list and POS product grid. | E2E |
| FLOW-CAT-002 | Admin session | Deactivate category | Products in category are hidden from cashier checkout. | E2E |
| FLOW-CAT-003 | Admin session | Mark product unavailable | Product no longer appears for cashier checkout. | E2E |
| FLOW-CAT-004 | Existing historical order | Rename product/variant | Existing receipt/order history keeps snapshot names. | Integration/E2E |

### Checkout And Payment Flow

| ID | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- |
| FLOW-CHK-001 | Cashier session, available product | Add item, pay exact cash | Paid order is created and receipt is shown. | E2E |
| FLOW-CHK-002 | Cashier session, available product | Add item, overpay cash | Paid order shows correct change. | E2E |
| FLOW-CHK-003 | Cashier session | Hold cart, resume, pay | Held order becomes paid and is removed from held list. | E2E |
| FLOW-CHK-004 | Cashier session | Hold cart, cancel held order | Order is cancelled without payment or stock deduction. | E2E |
| FLOW-CHK-005 | Offline/browser network unavailable | Attempt checkout mutation | Mutation is blocked or rejected. | Manual/E2E |

### Inventory Flow

| ID | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- |
| FLOW-INV-001 | Admin session | Create ingredient and recipe | Recipe is available for checkout stock validation. | E2E |
| FLOW-INV-002 | Product recipe has enough stock | Paid checkout | Ingredient stock decreases and sale deduction movement is recorded. | Integration/E2E |
| FLOW-INV-003 | Product recipe has insufficient stock | Paid checkout | Checkout is blocked and no order/payment is created. | Integration/E2E |
| FLOW-INV-004 | Admin session | Record adjustment increase | Stock increases and movement history shows adjustment. | E2E |
| FLOW-INV-005 | Admin session | Record waste decrease | Stock decreases and movement history shows waste. | E2E |

### Kitchen And Queue Flow

| ID | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- |
| FLOW-KIT-001 | Paid checkout created | Open kitchen board | Order appears under received. | E2E |
| FLOW-KIT-002 | Kitchen order received | Move to preparing | Order moves to preparing and queue display updates. | E2E |
| FLOW-KIT-003 | Kitchen order preparing | Move to ready | Order moves to ready and public queue highlights it. | E2E |
| FLOW-KIT-004 | Kitchen order ready | Move to completed | Order leaves active kitchen/queue views. | E2E |
| FLOW-KIT-005 | Kitchen order ready | Attempt backward transition | Transition is rejected. | E2E/API |

### Reporting Flow

| ID | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- |
| FLOW-REP-001 | Admin session, paid orders exist | Open dashboard | Sales, payment, top products, stock, and cashier widgets load. | E2E |
| FLOW-REP-002 | Cashier session | Open dashboard report route/API | Access is forbidden. | E2E/API |
| FLOW-REP-003 | Date range selected | Refresh dashboard | Report values reflect selected range only. | E2E |
| FLOW-REP-004 | Refund records exist | Load report | Net sales reflect refund amounts. | Integration |

### Accounting Flow

| ID | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- |
| FLOW-ACC-001 | Accounting enabled, paid cash checkout | Open journal list | Sales journal entry exists and balances. | E2E/Integration |
| FLOW-ACC-002 | Admin session | Create expense | Expense appears in expense list, journal history, and reports. | E2E |
| FLOW-ACC-003 | Admin session | Create cash movement | Movement appears in cash ledger and journal history. | E2E |
| FLOW-ACC-004 | Admin session | Close business date | Daily close record appears with expected/count/difference values. | E2E |
| FLOW-ACC-005 | Cashier session | Open accounting route/API | Access is forbidden. | E2E/API |

## API Route Test Cases

| ID | Route group | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- | --- |
| API-001 | All protected APIs | No session | Call route | Unauthorized response. | API |
| API-002 | Admin-only APIs | Cashier session | Call route | Forbidden response. | API |
| API-003 | Mutation APIs | Invalid JSON body | Call route | Validation error response. | API |
| API-004 | Mutation APIs | Valid body | Call route | Success response shape is stable. | API |
| API-005 | `/api/users` | Admin session | GET/POST | Lists and creates users. | API |
| API-006 | `/api/users/[id]` | Admin session | PATCH | Updates user or returns not found. | API |
| API-007 | `/api/categories` | Admin/cashier contexts | GET/POST | GET follows visibility rules; POST admin-only. | API |
| API-008 | `/api/categories/[id]` | Admin session | PATCH | Updates category or returns not found. | API |
| API-009 | `/api/products` | Admin/cashier contexts | GET/POST | GET follows visibility rules; POST admin-only. | API |
| API-010 | `/api/products/[id]` | Admin session | PATCH | Updates product or returns not found. | API |
| API-011 | `/api/settings` | Admin/cashier contexts | GET/PATCH | GET allowed by product decision; PATCH admin-only. | API |
| API-012 | `/api/orders/checkout` | Cashier session | POST | Finalizes checkout or returns validation error. | API |
| API-013 | `/api/orders/held` | Cashier session | GET/POST | Lists and creates held orders. | API |
| API-014 | `/api/orders/held/[id]` | Authorized actor | GET | Returns held order detail. | API |
| API-015 | `/api/orders` | Authenticated actor | GET | Returns authorized order history. | API |
| API-016 | `/api/orders/[id]` | Authorized actor | GET | Returns order detail or not found. | API |
| API-017 | `/api/orders/[id]/cancel` | Authorized actor | POST | Cancels eligible order. | API |
| API-018 | `/api/ingredients` | Admin session | GET/POST | Lists and creates ingredients. | API |
| API-019 | `/api/ingredients/[id]` | Admin session | PATCH | Updates ingredient. | API |
| API-020 | `/api/ingredients/[id]/adjustments` | Admin session | POST | Adjusts stock. | API |
| API-021 | `/api/stock-movements` | Admin session | GET | Lists filtered stock movements. | API |
| API-022 | `/api/kitchen/orders` | Authenticated kitchen/admin context | GET | Returns kitchen board orders when enabled. | API |
| API-023 | `/api/kitchen/orders/[id]/status` | Authenticated actor | PATCH | Changes valid kitchen status. | API |
| API-024 | `/api/queue` | Public or authenticated context | GET | Returns queue display when enabled. | API |
| API-025 | `/api/reports/dashboard` | Admin session | GET | Returns dashboard report. | API |
| API-026 | `/api/accounting/*` | Admin session | GET/POST/PATCH | Accounting routes enforce validation and role access. | API |

## Edge Case Test Cases

| ID | Area | Context | Action | Expected result | Type |
| --- | --- | --- | --- | --- | --- |
| EDGE-001 | Money | Decimal values with many fraction digits | Calculate totals | Values round consistently to money precision. | Unit |
| EDGE-002 | Money | Very large prices/quantities near database precision | Checkout | Rejects overflow-risk values or persists safely. | Integration |
| EDGE-003 | Checkout | Duplicate same product/variant lines | Checkout | Totals and stock deduction aggregate correctly. | Integration |
| EDGE-004 | Checkout | Discount greater than line total | Checkout | Line total floors at zero or rejects according to policy. | Unit/Integration |
| EDGE-005 | Checkout | Product deleted/unavailable after cart load | Checkout | Server rejects stale cart item. | Integration |
| EDGE-006 | Checkout | Variant deactivated after cart load | Checkout | Server rejects stale variant. | Integration |
| EDGE-007 | Checkout | Concurrent checkouts consume same stock | Finalize both | Only valid stock quantity succeeds; no negative stock. | Integration |
| EDGE-008 | Queue | Concurrent checkout creates queue numbers | Finalize many checkouts | Queue numbers remain unique per business date. | Integration |
| EDGE-009 | Session | Session expires during mutation | Submit mutation | Request is unauthorized and no mutation occurs. | API |
| EDGE-010 | Auth | User deactivated during active session | Call protected route | Session resolves as invalid. | Integration/API |
| EDGE-011 | Inventory | Ingredient inactive but recipe still references it | Checkout | Checkout rejects item when inventory enabled. | Integration |
| EDGE-012 | Inventory | Adjustment reason is whitespace | Adjust stock | Validation error. | Unit/Integration |
| EDGE-013 | Kitchen | Same status submitted repeatedly | Change status | Operation is idempotent and does not corrupt timestamps. | Integration |
| EDGE-014 | Kitchen | Completed order status update attempted | Change status | Invalid transition is rejected. | Integration |
| EDGE-015 | Reporting | Date range crosses DST in configured timezone | Parse/report | Business-date range remains correct. | Unit/Integration |
| EDGE-016 | Reporting | No data in range | Load report | Returns zero summaries and empty lists without error. | Integration |
| EDGE-017 | Accounting | Journal line imbalance caused by rounding | Create journal | Validation rejects imbalance. | Unit/Integration |
| EDGE-018 | Accounting | Duplicate daily close submitted concurrently | Close day twice | Only one close succeeds. | Integration |
| EDGE-019 | Accounting | Expense category deactivated after form load | Submit expense | Expense creation rejects inactive category. | Integration |
| EDGE-020 | Settings | Invalid configuration combination | Save settings | Settings validation rejects inconsistent state. | API |
| EDGE-021 | Module config | Disable module while page is open | Submit mutation from stale UI | API rejects disabled module mutation. | API/E2E |
| EDGE-022 | Module config | Re-enable module with historical records | Open module page | Historical data loads without duplicate side effects. | Integration/E2E |
| EDGE-023 | Receipt | Long store name/product name/notes | Render receipt | Text wraps without overlap or truncation of critical values. | E2E |
| EDGE-024 | API | Malformed query params | Call list/report route | Validation error and safe response shape. | API |
| EDGE-025 | Audit | Successful mutation | Mutate domain record | Activity log is written with actor, action, entity type, and entity id. | Integration |
| EDGE-026 | Audit | Failed validation | Submit invalid mutation | No misleading success audit log is written. | Integration |

## Recommended Automation Order

1. Configuration validation and module gating tests.
2. Checkout calculation, checkout finalization, and payment tests.
3. Auth/session and role boundary tests.
4. Inventory stock validation and stock movement tests.
5. Kitchen/queue transition and concurrency tests.
6. Accounting balance, mappings, and daily close tests.
7. Reporting aggregation tests.
8. E2E smoke flows for admin, cashier, kitchen, and disabled-module setups.

## Completion Criteria

- Every enabled module has unit tests for business rules.
- Every mutation route has unauthorized, forbidden, validation, success, and disabled-module coverage where applicable.
- Every configurable module has tests for enabled and disabled states.
- Checkout, inventory, kitchen, reporting, and accounting have end-to-end flow coverage.
- Edge cases that can corrupt money, stock, queue numbers, sessions, or accounting balances are covered by automated tests.
