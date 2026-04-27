# POS System

Single-store cafe POS built with Next.js, TypeScript, Prisma, PostgreSQL, TanStack Query, and Zustand.

## Features

- Admin and cashier authentication with session cookies
- Admin dashboard for users, categories, products, and store settings
- Cashier POS cart with product variants, discounts, held orders, and cash checkout
- Order history, order detail, cancellation, and receipt preview
- Prisma data model for users, sessions, catalog, orders, payments, refunds, stock movements, settings, and activity logs
- Local PostgreSQL development through Docker Compose

## Requirements

- Node.js 20+
- npm
- Docker, for the local PostgreSQL database

## Setup

Install dependencies:

```bash
npm install
```

Start PostgreSQL:

```bash
docker compose up -d
```

Create `.env`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pos_system?schema=public"
AUTH_SESSION_DAYS=7
```

Run the initial migration and seed data:

```bash
npm run prisma:migrate
npm run prisma:seed
```

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo Accounts

The seed script creates:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@pos.local` | `admin12345` |
| Cashier | `cashier@pos.local` | `cashier12345` |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js dev server |
| `npm run build` | Build the app |
| `npm run start` | Start the production server after build |
| `npm run lint` | Run ESLint |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Run Prisma migrations in development |
| `npm run prisma:seed` | Seed demo users, catalog data, and app settings |

## Project Structure

```text
src/app/                 Next.js routes, pages, and API route handlers
src/features/auth/       Login, sessions, roles, and user management
src/features/catalog/    Categories, products, variants, and settings
src/features/checkout/   Cart state, order calculations, checkout, and receipts
src/lib/                 Shared Prisma, API, axios, and number helpers
prisma/                  Schema, migrations, and seed script
docs/                    Product spec, milestone scope, and implementation notes
```

## Development Notes

- The MVP is online-only and single-store.
- Roles are limited to `admin` and `cashier`.
- Product prices are stored before tax and service charge.
- Tax and service charge are calculated from settings at checkout.
- Held orders do not reserve or deduct stock.
- Paid orders deduct tracked stock only after payment is confirmed.
