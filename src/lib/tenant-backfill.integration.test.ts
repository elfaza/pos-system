import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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
    expect(sql).toContain('user."role"::TEXT = \'admin\'');
    expect(sql).toContain("'owner'::\"OrganizationRole\"");
    expect(sql).toContain('user."role"::TEXT::"OutletRole"');
    expect(sql).not.toMatch(/ALTER TABLE\s+\"users\"[\s\S]*DROP COLUMN\s+\"role\"/i);
  });

  it("copies legacy availability and stock values and assigns existing sessions", () => {
    expect(sql).toMatch(/INSERT INTO\s+\"outlet_products\"[\s\S]*?is_available[\s\S]*?stock_quantity[\s\S]*?low_stock_threshold/i);
    expect(sql).toMatch(/INSERT INTO\s+\"outlet_ingredient_stocks\"[\s\S]*?current_stock[\s\S]*?low_stock_threshold/i);
    expect(sql).toMatch(/UPDATE\s+\"sessions\"[\s\S]*?active_organization_id[\s\S]*?active_outlet_id/i);
  });
});
