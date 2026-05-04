# Production Deployment

This POS is a single-store, online-only Next.js application backed by PostgreSQL.

## Required Environment

Set these variables in the deployment environment before starting the app:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma |
| `AUTH_SESSION_DAYS` | No | Positive whole number of days before sessions expire. Defaults to `7` |
| `NEXT_PUBLIC_APP_URL` | No | Public app URL for environments that need absolute links |

The app fails fast when `DATABASE_URL` is missing or `AUTH_SESSION_DAYS` is invalid. Keep real production secrets out of source control and `.env` examples.

## Build And Migration Flow

For a production-like Node.js deployment:

```bash
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run build
npm run start
```

For Vercel-style builds, `npm run vercel-build` runs Prisma generation, migration deploy, and the Next.js build in one command.

## Database Notes

- PostgreSQL is required.
- Use `npm run prisma:deploy` for production migration application.
- `npm run prisma:migrate` is for local development only.
- `npm run prisma:seed` creates demo/local data and is not required for production correctness.
- Migration history must remain committed before deployment.

## Release Validation

Run these commands before deploying a release:

```bash
npm run prisma:generate
npm test
npm run lint
npm run build
```

After deployment, verify login, POS checkout, held orders, order history, kitchen, queue, dashboard reports, and admin-only access with real environment configuration.

## Known MVP Limits

- Single store only.
- Online-only operation.
- Roles are limited to `admin` and `cashier`.
- Split payments, offline sync, multi-store, and hardware integrations are not part of the MVP.
