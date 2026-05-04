# 05 - API Contract

## Overview

The POS System exposes Next.js Route Handler APIs under `/api`. Routes use httpOnly cookie authentication, server-side authorization, request validation, and consistent JSON response behavior.

## Authentication Model

- Login creates a server-side session and sets an httpOnly cookie.
- Browser requests send the session cookie automatically.
- API routes resolve the current user from the session.
- Role checks happen server-side.
- Cashier users must receive forbidden responses for admin-only endpoints.

## Response Conventions

Successful responses return JSON data relevant to the route. Mutation routes should return the persisted resource or workflow result after server-side recalculation and authorization.

Error responses should use safe operational messages:

```json
{
  "message": "Unable to complete checkout because stock is insufficient.",
  "code": "INSUFFICIENT_STOCK"
}
```

Validation errors must not expose secrets, password hashes, stack traces, or raw database errors.

## Common Status Codes

| Status | Meaning |
| --- | --- |
| `200` | Request succeeded |
| `201` | Resource created |
| `400` | Invalid payload or workflow state |
| `401` | Not authenticated |
| `403` | Authenticated but not allowed |
| `404` | Resource not found |
| `409` | Business conflict, such as duplicate or invalid state transition |
| `500` | Unexpected server error |

## Route Summary

### Auth

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| Server action | Login/logout actions | Public/authenticated | Authenticate or clear current session |

Authentication is primarily implemented through feature actions and auth helpers rather than a broad public REST auth surface.

### Users

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/users` | Admin | List users |
| `POST` | `/api/users` | Admin | Create user |
| `PATCH` | `/api/users/[id]` | Admin | Update user |

Rules:

- Password hashes are never returned.
- Cashier cannot list or mutate users.
- User email must remain unique.

### Categories

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/categories` | Admin, Cashier | List categories for the current workflow |
| `POST` | `/api/categories` | Admin | Create category |
| `PATCH` | `/api/categories/[id]` | Admin | Update category |

Rules:

- Category slug must be unique.
- Cashier-facing catalog should hide inactive categories.

### Products

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/products` | Admin, Cashier | List products and variants |
| `POST` | `/api/products` | Admin | Create product |
| `PATCH` | `/api/products/[id]` | Admin | Update product and related editable data |

Rules:

- Product price must be non-negative.
- Variant price delta participates in checkout calculation.
- Cashier sees only sellable catalog data.

### Settings

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/settings` | Admin, Cashier | Read store and checkout settings needed by UI/receipt |
| `PATCH` | `/api/settings` | Admin | Update store, tax, service, reserved refund policy, and receipt settings |

Rules:

- Tax and service rates must be non-negative.
- Settings mutations are admin-only.

### Orders And Checkout

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/orders` | Admin, Cashier | List order history according to role |
| `GET` | `/api/orders/[id]` | Admin, Cashier | Get order detail |
| `POST` | `/api/orders/checkout` | Admin, Cashier | Finalize cash checkout |
| `POST` | `/api/orders/[id]/cancel` | Admin, Cashier | Cancel eligible unpaid/held order |
| `GET` | `/api/orders/held` | Admin, Cashier | List held orders |
| `POST` | `/api/orders/held` | Admin, Cashier | Hold current cart as order |
| `GET` | `/api/orders/held/[id]` | Admin, Cashier | Get held order detail |

Checkout request shape should include cart items, optional notes, discounts, and cash received data:

```json
{
  "items": [
    {
      "productId": "product_id",
      "variantId": "variant_id_or_null",
      "quantity": 2,
      "discountAmount": 0,
      "notes": "Less sugar"
    }
  ],
  "cashReceivedAmount": 50000,
  "notes": "Take away"
}
```

Rules:

- Server recalculates totals from database products and settings.
- Empty carts are rejected.
- Unavailable products are rejected.
- Insufficient stock is rejected before payment is marked paid.
- Paid checkout creates order, order items, payment, stock movements, queue number, and initial kitchen status as one consistent workflow.

### Ingredients And Inventory

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/ingredients` | Admin | List ingredients |
| `POST` | `/api/ingredients` | Admin | Create ingredient |
| `PATCH` | `/api/ingredients/[id]` | Admin | Update ingredient |
| `POST` | `/api/ingredients/[id]/adjustments` | Admin | Adjust stock or record waste |
| `GET` | `/api/stock-movements` | Admin | List stock movement history |

Rules:

- Cashier cannot mutate inventory.
- Adjustment and waste require reason.
- Stock cannot be reduced below zero by default.

### Kitchen

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/kitchen/orders` | Admin, Cashier | List active kitchen orders |
| `PATCH` | `/api/kitchen/orders/[id]/status` | Admin, Cashier | Update kitchen status |

Status update request:

```json
{
  "status": "preparing"
}
```

Rules:

- Valid statuses are `received`, `preparing`, `ready`, and `completed`.
- Backward transitions are rejected.
- Cancelled or refunded orders reject kitchen updates.
- Status changes create activity log entries.

### Queue

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/queue` | Admin, Cashier | List queue display data |

Rules:

- Active queue views include paid non-completed kitchen orders.
- Ready orders remain visible until completed.
- Queue number is assigned by server checkout logic only.

### Dashboard Reports

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/reports/dashboard` | Admin | Dashboard summary data |

Supported report concepts:

- Sales summary.
- Payment summary.
- Top products.
- Stock health.
- Cashier performance.

Rules:

- Cashier access is forbidden.
- Date filters must be validated.
- Report responses must be calculated from persisted server data.

### Reserved Refund Data

Refund models, statuses, settings fields, and report calculations exist so historical refund records can be represented and future refund workflows have a schema foundation. The current API does not expose an active refund creation, approval, or processing route.

## Connectivity Rules

- Offline UI can show previously loaded data.
- Checkout, hold, cancel, kitchen update, inventory adjustment, and settings mutation actions require network connectivity.
- Failed mutations must keep the prior visible state until a fresh server response is available.
