import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaClient as LegacyPrismaClient } from "../../node_modules/.prisma/legacy-prisma-client";
import { describe, expect, it } from "vitest";
import { loadLegacyTenantBaseline } from "../../prisma/fixtures/legacy-tenant-baseline";

const legacyDatabaseUrl = process.env.TENANT_BACKFILL_TEST_DATABASE_URL;
const postgresIntegration = legacyDatabaseUrl ? describe : describe.skip;

const migrationPath = join(
  process.cwd(),
  "prisma/migrations/20261001150000_tenant_legacy_backfill/migration.sql",
);

describe("legacy tenant backfill migration", () => {
  const sql = readFileSync(migrationPath, "utf8");

  it("uses stable legacy organization and outlet IDs and rejects conflicting identities", () => {
    expect(sql).toContain("org_legacy_default");
    expect(sql).toContain("outlet_legacy_default");
    expect(sql).toMatch(/RAISE EXCEPTION[\s\S]*?(?:organization|outlet)/i);
    expect(sql).toContain('ON CONFLICT ("id") DO NOTHING');
  });

  it("assigns every organization and operational root to the default tenant", () => {
    const organizationRoots = [
      "categories",
      "products",
      "product_variants",
      "ingredients",
      "accounts",
      "expense_categories",
    ];
    const operationalRoots = [
      "app_settings",
      "customer_display_states",
      "orders",
      "dining_tables",
      "stock_movements",
      "activity_logs",
      "journal_entries",
      "expenses",
      "cash_movements",
      "cash_ledger_entries",
      "daily_closes",
    ];

    for (const table of organizationRoots) {
      expect(sql).toMatch(new RegExp(`UPDATE \\"${table}\\"[\\s\\S]*?organization_id`, "i"));
    }
    for (const table of operationalRoots) {
      expect(sql).toMatch(
        new RegExp(`UPDATE \\"${table}\\"[\\s\\S]*?organization_id[\\s\\S]*?outlet_id`, "i"),
      );
    }
  });

  it("creates owner and outlet memberships while preserving legacy roles", () => {
    expect(sql).toContain('legacy_user."role"::TEXT = \'admin\'');
    expect(sql).toContain("'owner'::\"OrganizationRole\"");
    expect(sql).toContain('legacy_user."role"::TEXT::"OutletRole"');
    expect(sql).not.toMatch(/ALTER TABLE\s+\"users\"[\s\S]*DROP COLUMN\s+\"role\"/i);
  });

  it("copies legacy availability and stock values and assigns existing sessions", () => {
    expect(sql).toMatch(/INSERT INTO\s+\"outlet_products\"[\s\S]*?is_available[\s\S]*?stock_quantity[\s\S]*?low_stock_threshold/i);
    expect(sql).toMatch(/INSERT INTO\s+\"outlet_ingredient_stocks\"[\s\S]*?current_stock[\s\S]*?low_stock_threshold/i);
    expect(sql).toMatch(/UPDATE\s+\"sessions\"[\s\S]*?active_organization_id[\s\S]*?active_outlet_id/i);
  });
});

postgresIntegration("legacy tenant backfill against PostgreSQL", () => {
  it("loads the deterministic fixture, applies migrations, and verifies all invariants", async () => {
    const databaseName = new URL(legacyDatabaseUrl!).pathname;
    expect(databaseName).toMatch(/_test$/);

    const reportsDirectory = await mkdtemp(join(tmpdir(), "tenant-backfill-reports-"));
    const beforePath = join(reportsDirectory, "before.json");
    const afterPath = join(reportsDirectory, "after.json");
    const env = { ...process.env, DATABASE_URL: legacyDatabaseUrl! };
    const prisma = new PrismaClient({ datasources: { db: { url: legacyDatabaseUrl! } } });
    const legacyPrisma = new LegacyPrismaClient({ datasources: { db: { url: legacyDatabaseUrl! } } });

    try {
      const [migrationState] = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM "_prisma_migrations"
        WHERE "finished_at" IS NOT NULL
      `;
      expect(Number(migrationState.count)).toBe(13);
      await loadLegacyTenantBaseline(legacyPrisma);
      await legacyPrisma.$disconnect();
      await prisma.$disconnect();

      execFileSync("npm", ["run", "tenant:invariants:capture", "--", "--stage", "legacy", "--output", beforePath], { cwd: process.cwd(), env, stdio: "pipe" });
      execFileSync("npx", ["prisma", "migrate", "deploy"], { cwd: process.cwd(), env, stdio: "pipe" });
      execFileSync("npm", ["run", "tenant:invariants:capture", "--", "--stage", "tenant", "--output", afterPath], { cwd: process.cwd(), env, stdio: "pipe" });
      execFileSync("npm", ["run", "tenant:invariants:verify", "--", "--before", beforePath, "--after", afterPath], { cwd: process.cwd(), env, stdio: "pipe" });
    } finally {
      await prisma.$disconnect();
      await legacyPrisma.$disconnect();
      await rm(reportsDirectory, { recursive: true, force: true });
    }
  }, 180_000);
});
