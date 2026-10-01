import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  createTenantInvariantSnapshot,
  type TenantIntegrityMetrics,
} from "../src/lib/tenant-migration-invariants";

type QueryValue = string | number | bigint | null;
type QueryRow = Record<string, QueryValue>;

function readOption(name: string): string | undefined {
  const inline = process.argv.find((argument) =>
    argument.startsWith(`--${name}=`),
  );
  if (inline) return inline.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseStage(): "legacy" | "tenant" {
  const stage = readOption("stage");
  if (stage === "legacy" || stage === "tenant") return stage;

  throw new Error("Pass --stage legacy or --stage tenant.");
}

function toCountRecord(row: QueryRow): Record<string, number> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      const count = Number(value);
      if (!Number.isSafeInteger(count) || count < 0) {
        throw new Error(`Database returned an invalid count for ${key}.`);
      }
      return [key, count];
    }),
  );
}

function toFinancialRecord(row: QueryRow): Record<string, string> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, String(value ?? "0")]),
  );
}

async function captureRowCounts(prisma: PrismaClient) {
  const [row] = await prisma.$queryRaw<QueryRow[]>`
    SELECT
      (SELECT COUNT(*)::text FROM users) AS "users",
      (SELECT COUNT(*)::text FROM sessions) AS "sessions",
      (SELECT COUNT(*)::text FROM categories) AS "categories",
      (SELECT COUNT(*)::text FROM products) AS "products",
      (SELECT COUNT(*)::text FROM product_variants) AS "productVariants",
      (SELECT COUNT(*)::text FROM product_option_groups) AS "productOptionGroups",
      (SELECT COUNT(*)::text FROM product_option_values) AS "productOptionValues",
      (SELECT COUNT(*)::text FROM ingredients) AS "ingredients",
      (SELECT COUNT(*)::text FROM product_ingredients) AS "productIngredients",
      (SELECT COUNT(*)::text FROM product_option_value_ingredients) AS "productOptionValueIngredients",
      (SELECT COUNT(*)::text FROM product_option_value_ingredient_replacements) AS "productOptionValueIngredientReplacements",
      (SELECT COUNT(*)::text FROM app_settings) AS "appSettings",
      (SELECT COUNT(*)::text FROM customer_display_states) AS "customerDisplayStates",
      (SELECT COUNT(*)::text FROM orders) AS "orders",
      (SELECT COUNT(*)::text FROM dining_tables) AS "diningTables",
      (SELECT COUNT(*)::text FROM order_items) AS "orderItems",
      (SELECT COUNT(*)::text FROM order_item_option_selections) AS "orderItemOptionSelections",
      (SELECT COUNT(*)::text FROM payments) AS "payments",
      (SELECT COUNT(*)::text FROM refunds) AS "refunds",
      (SELECT COUNT(*)::text FROM stock_movements) AS "stockMovements",
      (SELECT COUNT(*)::text FROM activity_logs) AS "activityLogs",
      (SELECT COUNT(*)::text FROM accounts) AS "accounts",
      (SELECT COUNT(*)::text FROM journal_entries) AS "journalEntries",
      (SELECT COUNT(*)::text FROM journal_entry_lines) AS "journalEntryLines",
      (SELECT COUNT(*)::text FROM expense_categories) AS "expenseCategories",
      (SELECT COUNT(*)::text FROM expenses) AS "expenses",
      (SELECT COUNT(*)::text FROM cash_movements) AS "cashMovements",
      (SELECT COUNT(*)::text FROM cash_ledger_entries) AS "cashLedgerEntries",
      (SELECT COUNT(*)::text FROM daily_closes) AS "dailyCloses"
  `;

  if (!row) throw new Error("Database did not return row-count metrics.");
  return toCountRecord(row);
}

async function captureFinancialSums(prisma: PrismaClient) {
  const [row] = await prisma.$queryRaw<QueryRow[]>`
    SELECT
      (SELECT COALESCE(SUM(total_amount), 0)::text FROM orders) AS "orderTotalAmount",
      (SELECT COALESCE(SUM(amount), 0)::text FROM payments) AS "paymentAmount",
      (SELECT COALESCE(SUM(amount), 0)::text FROM refunds) AS "refundAmount",
      (SELECT COALESCE(SUM(amount), 0)::text FROM expenses) AS "expenseAmount",
      (SELECT COALESCE(SUM(amount), 0)::text FROM cash_movements) AS "cashMovementAmount",
      (SELECT COALESCE(SUM(debit_amount), 0)::text FROM journal_entry_lines) AS "journalDebitAmount",
      (SELECT COALESCE(SUM(credit_amount), 0)::text FROM journal_entry_lines) AS "journalCreditAmount"
  `;

  if (!row) throw new Error("Database did not return financial metrics.");
  return toFinancialRecord(row);
}

async function captureTenantIntegrity(
  prisma: PrismaClient,
): Promise<TenantIntegrityMetrics> {
  const [row] = await prisma.$queryRaw<QueryRow[]>`
    SELECT
      (
        SELECT COALESCE(SUM("count"), 0)::text
        FROM (
          SELECT COUNT(*) AS "count" FROM categories WHERE organization_id IS NULL
          UNION ALL SELECT COUNT(*) FROM products WHERE organization_id IS NULL
          UNION ALL SELECT COUNT(*) FROM product_variants WHERE organization_id IS NULL
          UNION ALL SELECT COUNT(*) FROM ingredients WHERE organization_id IS NULL
          UNION ALL SELECT COUNT(*) FROM accounts WHERE organization_id IS NULL
          UNION ALL SELECT COUNT(*) FROM expense_categories WHERE organization_id IS NULL
          UNION ALL SELECT COUNT(*) FROM app_settings WHERE organization_id IS NULL OR outlet_id IS NULL
          UNION ALL SELECT COUNT(*) FROM customer_display_states WHERE organization_id IS NULL OR outlet_id IS NULL
          UNION ALL SELECT COUNT(*) FROM orders WHERE organization_id IS NULL OR outlet_id IS NULL
          UNION ALL SELECT COUNT(*) FROM dining_tables WHERE organization_id IS NULL OR outlet_id IS NULL
          UNION ALL SELECT COUNT(*) FROM stock_movements WHERE organization_id IS NULL OR outlet_id IS NULL
          UNION ALL SELECT COUNT(*) FROM activity_logs WHERE organization_id IS NULL OR outlet_id IS NULL
          UNION ALL SELECT COUNT(*) FROM journal_entries WHERE organization_id IS NULL OR outlet_id IS NULL
          UNION ALL SELECT COUNT(*) FROM expenses WHERE organization_id IS NULL OR outlet_id IS NULL
          UNION ALL SELECT COUNT(*) FROM cash_movements WHERE organization_id IS NULL OR outlet_id IS NULL
          UNION ALL SELECT COUNT(*) FROM cash_ledger_entries WHERE organization_id IS NULL OR outlet_id IS NULL
          UNION ALL SELECT COUNT(*) FROM daily_closes WHERE organization_id IS NULL OR outlet_id IS NULL
        ) null_counts
      ) AS "nullTenantKeys",
      (
        SELECT COALESCE(SUM("count"), 0)::text
        FROM (
          SELECT COUNT(*) AS "count" FROM app_settings record LEFT JOIN outlets outlet ON outlet.id = record.outlet_id WHERE outlet.id IS NULL OR outlet.organization_id <> record.organization_id
          UNION ALL SELECT COUNT(*) FROM customer_display_states record LEFT JOIN outlets outlet ON outlet.id = record.outlet_id WHERE outlet.id IS NULL OR outlet.organization_id <> record.organization_id
          UNION ALL SELECT COUNT(*) FROM orders record LEFT JOIN outlets outlet ON outlet.id = record.outlet_id WHERE outlet.id IS NULL OR outlet.organization_id <> record.organization_id
          UNION ALL SELECT COUNT(*) FROM dining_tables record LEFT JOIN outlets outlet ON outlet.id = record.outlet_id WHERE outlet.id IS NULL OR outlet.organization_id <> record.organization_id
          UNION ALL SELECT COUNT(*) FROM stock_movements record LEFT JOIN outlets outlet ON outlet.id = record.outlet_id WHERE outlet.id IS NULL OR outlet.organization_id <> record.organization_id
          UNION ALL SELECT COUNT(*) FROM activity_logs record LEFT JOIN outlets outlet ON outlet.id = record.outlet_id WHERE outlet.id IS NULL OR outlet.organization_id <> record.organization_id
          UNION ALL SELECT COUNT(*) FROM journal_entries record LEFT JOIN outlets outlet ON outlet.id = record.outlet_id WHERE outlet.id IS NULL OR outlet.organization_id <> record.organization_id
          UNION ALL SELECT COUNT(*) FROM expenses record LEFT JOIN outlets outlet ON outlet.id = record.outlet_id WHERE outlet.id IS NULL OR outlet.organization_id <> record.organization_id
          UNION ALL SELECT COUNT(*) FROM cash_movements record LEFT JOIN outlets outlet ON outlet.id = record.outlet_id WHERE outlet.id IS NULL OR outlet.organization_id <> record.organization_id
          UNION ALL SELECT COUNT(*) FROM cash_ledger_entries record LEFT JOIN outlets outlet ON outlet.id = record.outlet_id WHERE outlet.id IS NULL OR outlet.organization_id <> record.organization_id
          UNION ALL SELECT COUNT(*) FROM daily_closes record LEFT JOIN outlets outlet ON outlet.id = record.outlet_id WHERE outlet.id IS NULL OR outlet.organization_id <> record.organization_id
        ) invalid_pairs
      ) AS "invalidOutletOrganizationPairs",
      (
        SELECT COUNT(*)::text
        FROM users user_record
        WHERE NOT EXISTS (
          SELECT 1 FROM organization_memberships membership
          WHERE membership.user_id = user_record.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM outlet_memberships membership
          WHERE membership.user_id = user_record.id
        )
      ) AS "usersWithoutMembership",
      (
        SELECT COUNT(*)::text
        FROM products product
        JOIN outlets outlet ON outlet.organization_id = product.organization_id
        LEFT JOIN outlet_products outlet_product
          ON outlet_product.product_id = product.id
          AND outlet_product.outlet_id = outlet.id
        WHERE outlet_product.id IS NULL
      ) AS "missingOutletProductRows",
      (
        SELECT COUNT(*)::text
        FROM ingredients ingredient
        JOIN outlets outlet ON outlet.organization_id = ingredient.organization_id
        LEFT JOIN outlet_ingredient_stocks stock
          ON stock.ingredient_id = ingredient.id
          AND stock.outlet_id = outlet.id
        WHERE stock.id IS NULL
      ) AS "missingOutletIngredientStockRows"
  `;

  if (!row) throw new Error("Database did not return tenant integrity metrics.");
  return toCountRecord(row) as unknown as TenantIntegrityMetrics;
}

async function writeSnapshot(serialized: string) {
  const output = readOption("output");
  if (!output) {
    process.stdout.write(serialized);
    return;
  }

  const outputPath = resolve(output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serialized, { encoding: "utf8", flag: "wx" });
  process.stdout.write(`Wrote tenant invariant snapshot to ${outputPath}.\n`);
}

async function main() {
  const stage = parseStage();
  const prisma = new PrismaClient();

  try {
    const snapshot = createTenantInvariantSnapshot({
      capturedAt: new Date(),
      stage,
      rowCounts: await captureRowCounts(prisma),
      financialSums: await captureFinancialSums(prisma),
      tenantIntegrity:
        stage === "tenant" ? await captureTenantIntegrity(prisma) : null,
    });

    await writeSnapshot(`${JSON.stringify(snapshot, null, 2)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
