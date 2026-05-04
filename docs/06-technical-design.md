# 06 - Technical Design

## Architecture

The POS System is a modular monolith built with Next.js. Frontend pages, API route handlers, business services, repositories, and Prisma database access live in one deployable application.

```text
Next.js UI
  -> Route Handlers / Server Actions
  -> Feature Services
  -> Repositories
  -> Prisma ORM
  -> PostgreSQL
```

## Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 |
| UI | React 19, TypeScript, Tailwind CSS |
| Server state | TanStack Query |
| Local UI state | Zustand |
| API | Next.js Route Handlers |
| ORM | Prisma |
| Database | PostgreSQL |
| Tests | Vitest |
| Local database | Docker Compose |

## Module Boundaries

| Module | Responsibility |
| --- | --- |
| `auth` | Login, sessions, password hashing, role checks, users |
| `catalog` | Categories, products, variants, settings |
| `checkout` | Cart state, calculations, orders, cash payments, receipts |
| `inventory` | Ingredients, recipes, stock adjustments, stock movements |
| `kitchen` | Queue number assignment, kitchen order listing, status transitions |
| `reporting` | Dashboard aggregation and report data |
| `lib` | Shared Prisma client, API helpers, Axios client, number/money helpers |

## Application Routes

| Route | Purpose |
| --- | --- |
| `/` | Auth-aware landing/redirect behavior |
| `/pos` | Cashier POS |
| `/orders` | Order history and receipt access |
| `/kitchen` | Kitchen display |
| `/queue` | Queue display |
| `/dashboard` | Admin dashboard |
| `/dashboard/users` | Admin user management |
| `/dashboard/categories` | Admin category management |
| `/dashboard/products` | Admin product management |
| `/dashboard/inventory` | Admin inventory management |
| `/dashboard/settings` | Admin settings |

## Data Flow: Cash Checkout

1. Cashier builds cart in Zustand state.
2. Cashier submits checkout request with item IDs, quantities, discounts, notes, and cash received.
3. API route authenticates user.
4. Checkout service loads authoritative products, variants, recipes, and settings.
5. Service recalculates subtotal, discount, tax, service charge, and total.
6. Service validates product availability, cash received, and stock sufficiency.
7. Database transaction creates paid order, order items, payment, stock movements, queue number, and kitchen status.
8. Response returns paid order detail for success, receipt, and queue display.

## Data Flow: Inventory Adjustment

1. Admin submits ingredient adjustment or waste request.
2. API authenticates and authorizes admin role.
3. Inventory service validates quantity, reason, and stock constraints.
4. Transaction updates ingredient stock and inserts stock movement.
5. Response returns updated inventory state.

## Data Flow: Kitchen Status

1. User opens kitchen screen and loads active paid orders.
2. User submits next status.
3. Kitchen service validates order state and transition.
4. Transaction updates kitchen status timestamp and activity log.
5. UI refreshes active kitchen/queue data.

## Security Design

- Passwords are hashed before persistence.
- Session tokens are stored as hashes.
- Session cookie is httpOnly.
- API routes must resolve authenticated user before mutation.
- Role checks are enforced in service/API layers.
- Admin-only routes reject cashier users.
- User responses never include password hashes.
- Environment secrets must not be committed.

## Calculation Design

- Server services are the source of truth for checkout and reporting calculations.
- Product prices are tax-exclusive and service-exclusive by default.
- Order item snapshots preserve historical product and variant display.
- Money values use decimal-safe helpers and persisted totals.
- Stock deduction is transactional and idempotency-sensitive.
- Reports aggregate persisted records rather than client state.

## Connectivity Design

The MVP is online-only:

- Mutation actions are disabled or rejected while offline.
- Previously loaded data may remain visible as stale.
- Checkout, held orders, payment, inventory, kitchen, queue mutation, and reporting refresh require network access.

## Deployment Design

Production-like deployments require:

- Node.js runtime compatible with the app.
- PostgreSQL database.
- `DATABASE_URL`.
- Prisma Client generation.
- Prisma migration deploy.
- Next.js production build.

Standard flow:

```bash
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run build
npm run start
```

## Operational Constraints

- Single-store MVP.
- No background job processor.
- No offline sync queue.
- No active QRIS provider integration.
- No hardware integration layer.
- Dashboard reports are operational summaries, not accounting-grade statements.

## Extension Points

Future modules can build on current boundaries:

- QRIS provider service using existing payment provider fields.
- Multi-store support by introducing store/branch ownership to catalog, orders, inventory, and users.
- Hardware adapters for receipt printers or cash drawers.
- More advanced reporting using views or materialized summary tables if query load requires it.
