# 11 - Environment Setup

## Requirements

- Node.js 20 or newer.
- npm.
- Docker for local PostgreSQL.
- PostgreSQL for production-like deployments.

## Install Dependencies

```bash
npm install
```

For production-like installs, use:

```bash
npm ci
```

## Local Database

Start PostgreSQL:

```bash
docker compose up -d
```

The local Docker Compose database uses PostgreSQL 18.3. If an older PostgreSQL major version was used previously, recreate the local database volume before starting the container again.

## Environment Variables

Create `.env` in the project root:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pos_system?schema=public"
AUTH_SESSION_DAYS=7
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma |
| `AUTH_SESSION_DAYS` | No | Positive whole number of days before sessions expire; defaults to `7` |
| `NEXT_PUBLIC_APP_URL` | No | Public app URL for links and environment-aware behavior |

Rules:

- Do not commit real production secrets.
- The app fails fast when `DATABASE_URL` is missing.
- `AUTH_SESSION_DAYS` must be a positive whole number when set.

## Prisma Setup

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run local development migrations:

```bash
npm run prisma:migrate
```

Seed demo data:

```bash
npm run prisma:seed
```

Seeded demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@pos.local` | `admin12345` |
| Cashier | `cashier@pos.local` | `cashier12345` |

## Start Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local Next.js development server |
| `npm run build` | Build production Next.js app |
| `npm run start` | Start production server after build |
| `npm test` | Run Vitest suite |
| `npm run lint` | Run ESLint |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:deploy` | Apply committed migrations in production/staging |
| `npm run prisma:migrate` | Create/apply development migrations |
| `npm run prisma:seed` | Seed local/demo data |
| `npm run vercel-build` | Generate Prisma Client, deploy migrations, and build for Vercel |

## Production-Like Deployment Flow

```bash
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run build
npm run start
```

For Vercel-style builds:

```bash
npm run vercel-build
```

## Database Notes

- PostgreSQL is required.
- `npm run prisma:deploy` is for production/staging migration application.
- `npm run prisma:migrate` is for local development.
- `npm run prisma:seed` is for local/demo data and is not required for production correctness.
- Migration history must be committed before deployment.

## Release Validation

Before deploying:

```bash
npm run prisma:generate
npm test
npm run lint
npm run build
```

After deployment, smoke test:

- Admin login.
- Cashier login.
- Catalog load.
- Cash checkout.
- Held order.
- Receipt preview.
- Kitchen status update.
- Queue display.
- Dashboard report load.
- Cashier blocked from admin dashboard.

## Known MVP Limits

- Single-store only.
- Online-only operation.
- Admin and cashier roles only.
- Cash payment only as active payment workflow.
- QRIS integration deferred.
- No split payments.
- No offline sync.
- No hardware integration.
