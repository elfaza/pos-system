-- Fail before contracting any columns if the expanded data no longer satisfies
-- the tenant invariant recorded by the Phase 6 rehearsal.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM categories WHERE organization_id IS NULL)
       OR EXISTS (SELECT 1 FROM products WHERE organization_id IS NULL)
       OR EXISTS (SELECT 1 FROM product_variants WHERE organization_id IS NULL)
       OR EXISTS (SELECT 1 FROM ingredients WHERE organization_id IS NULL)
       OR EXISTS (SELECT 1 FROM accounts WHERE organization_id IS NULL)
       OR EXISTS (SELECT 1 FROM expense_categories WHERE organization_id IS NULL)
       OR EXISTS (SELECT 1 FROM app_settings WHERE organization_id IS NULL OR outlet_id IS NULL)
       OR EXISTS (SELECT 1 FROM customer_display_states WHERE organization_id IS NULL OR outlet_id IS NULL)
       OR EXISTS (SELECT 1 FROM orders WHERE organization_id IS NULL OR outlet_id IS NULL)
       OR EXISTS (SELECT 1 FROM dining_tables WHERE organization_id IS NULL OR outlet_id IS NULL)
       OR EXISTS (SELECT 1 FROM stock_movements WHERE organization_id IS NULL OR outlet_id IS NULL)
       OR EXISTS (SELECT 1 FROM activity_logs WHERE organization_id IS NULL OR outlet_id IS NULL)
       OR EXISTS (SELECT 1 FROM journal_entries WHERE organization_id IS NULL OR outlet_id IS NULL)
       OR EXISTS (SELECT 1 FROM expenses WHERE organization_id IS NULL OR outlet_id IS NULL)
       OR EXISTS (SELECT 1 FROM cash_movements WHERE organization_id IS NULL OR outlet_id IS NULL)
       OR EXISTS (SELECT 1 FROM cash_ledger_entries WHERE organization_id IS NULL OR outlet_id IS NULL)
       OR EXISTS (SELECT 1 FROM daily_closes WHERE organization_id IS NULL OR outlet_id IS NULL) THEN
        RAISE EXCEPTION 'Tenant contract stopped: one or more tenant keys are null';
    END IF;

    IF EXISTS (SELECT 1 FROM app_settings r LEFT JOIN outlets o ON o.id = r.outlet_id WHERE o.id IS NULL OR o.organization_id <> r.organization_id)
       OR EXISTS (SELECT 1 FROM customer_display_states r LEFT JOIN outlets o ON o.id = r.outlet_id WHERE o.id IS NULL OR o.organization_id <> r.organization_id)
       OR EXISTS (SELECT 1 FROM orders r LEFT JOIN outlets o ON o.id = r.outlet_id WHERE o.id IS NULL OR o.organization_id <> r.organization_id)
       OR EXISTS (SELECT 1 FROM dining_tables r LEFT JOIN outlets o ON o.id = r.outlet_id WHERE o.id IS NULL OR o.organization_id <> r.organization_id)
       OR EXISTS (SELECT 1 FROM stock_movements r LEFT JOIN outlets o ON o.id = r.outlet_id WHERE o.id IS NULL OR o.organization_id <> r.organization_id)
       OR EXISTS (SELECT 1 FROM activity_logs r LEFT JOIN outlets o ON o.id = r.outlet_id WHERE o.id IS NULL OR o.organization_id <> r.organization_id)
       OR EXISTS (SELECT 1 FROM journal_entries r LEFT JOIN outlets o ON o.id = r.outlet_id WHERE o.id IS NULL OR o.organization_id <> r.organization_id)
       OR EXISTS (SELECT 1 FROM expenses r LEFT JOIN outlets o ON o.id = r.outlet_id WHERE o.id IS NULL OR o.organization_id <> r.organization_id)
       OR EXISTS (SELECT 1 FROM cash_movements r LEFT JOIN outlets o ON o.id = r.outlet_id WHERE o.id IS NULL OR o.organization_id <> r.organization_id)
       OR EXISTS (SELECT 1 FROM cash_ledger_entries r LEFT JOIN outlets o ON o.id = r.outlet_id WHERE o.id IS NULL OR o.organization_id <> r.organization_id)
       OR EXISTS (SELECT 1 FROM daily_closes r LEFT JOIN outlets o ON o.id = r.outlet_id WHERE o.id IS NULL OR o.organization_id <> r.organization_id) THEN
        RAISE EXCEPTION 'Tenant contract stopped: an operational row points at an outlet in another organization';
    END IF;

    IF EXISTS (SELECT 1 FROM products p JOIN categories c ON c.id = p.category_id WHERE p.organization_id <> c.organization_id)
       OR EXISTS (SELECT 1 FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.organization_id <> p.organization_id)
       OR EXISTS (SELECT 1 FROM expense_categories c JOIN accounts a ON a.id = c.account_id WHERE c.organization_id <> a.organization_id)
       OR EXISTS (SELECT 1 FROM outlet_products op JOIN outlets o ON o.id = op.outlet_id JOIN products p ON p.id = op.product_id WHERE o.organization_id <> p.organization_id)
       OR EXISTS (SELECT 1 FROM outlet_ingredient_stocks s JOIN outlets o ON o.id = s.outlet_id JOIN ingredients i ON i.id = s.ingredient_id WHERE o.organization_id <> i.organization_id) THEN
        RAISE EXCEPTION 'Tenant contract stopped: a catalog or stock relationship crosses organizations';
    END IF;
END $$;

-- DropIndex
DROP INDEX "categories_slug_key";

-- DropIndex
DROP INDEX "customer_display_states_scope_key_key";

-- DropIndex
DROP INDEX "ingredients_sku_key";

-- DropIndex
DROP INDEX "product_variants_sku_key";

-- DropIndex
DROP INDEX "products_organization_id_is_available_idx";

-- DropIndex
DROP INDEX "products_sku_key";

-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "organization_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "activity_logs" ALTER COLUMN "organization_id" SET NOT NULL,
ALTER COLUMN "outlet_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "app_settings" ALTER COLUMN "organization_id" SET NOT NULL,
ALTER COLUMN "outlet_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "cash_ledger_entries" ALTER COLUMN "organization_id" SET NOT NULL,
ALTER COLUMN "outlet_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "cash_movements" ALTER COLUMN "organization_id" SET NOT NULL,
ALTER COLUMN "outlet_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "organization_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "customer_display_states" DROP COLUMN "scope_key",
ALTER COLUMN "organization_id" SET NOT NULL,
ALTER COLUMN "outlet_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "daily_closes" ALTER COLUMN "organization_id" SET NOT NULL,
ALTER COLUMN "outlet_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "dining_tables" ALTER COLUMN "organization_id" SET NOT NULL,
ALTER COLUMN "outlet_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "expense_categories" ALTER COLUMN "organization_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "expenses" ALTER COLUMN "organization_id" SET NOT NULL,
ALTER COLUMN "outlet_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "ingredients" DROP COLUMN "current_stock",
DROP COLUMN "low_stock_threshold",
ALTER COLUMN "organization_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "journal_entries" ALTER COLUMN "organization_id" SET NOT NULL,
ALTER COLUMN "outlet_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "organization_id" SET NOT NULL,
ALTER COLUMN "outlet_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "product_option_value_ingredient_replacements" RENAME CONSTRAINT "pov_ingredient_replacements_pkey" TO "product_option_value_ingredient_replacements_pkey";

-- AlterTable
ALTER TABLE "product_variants" ALTER COLUMN "organization_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "is_available",
DROP COLUMN "low_stock_threshold",
DROP COLUMN "stock_quantity",
ALTER COLUMN "organization_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "stock_movements" ALTER COLUMN "organization_id" SET NOT NULL,
ALTER COLUMN "outlet_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role";

-- DropEnum
DROP TYPE "UserRole";

-- CreateIndex
CREATE UNIQUE INDEX "categories_organization_id_slug_key" ON "categories"("organization_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "customer_display_states_organization_id_outlet_id_key" ON "customer_display_states"("organization_id", "outlet_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_organization_id_sku_key" ON "ingredients"("organization_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_organization_id_sku_key" ON "product_variants"("organization_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_organization_id_sku_key" ON "products"("organization_id", "sku");

-- RenameForeignKey
ALTER TABLE "product_option_value_ingredient_replacements" RENAME CONSTRAINT "pov_ingredient_replacements_option_value_id_fkey" TO "product_option_value_ingredient_replacements_option_value__fkey";

-- RenameForeignKey
ALTER TABLE "product_option_value_ingredient_replacements" RENAME CONSTRAINT "pov_ingredient_replacements_replaced_id_fkey" TO "product_option_value_ingredient_replacements_replaced_ingr_fkey";

-- RenameForeignKey
ALTER TABLE "product_option_value_ingredient_replacements" RENAME CONSTRAINT "pov_ingredient_replacements_replacement_id_fkey" TO "product_option_value_ingredient_replacements_replacement_i_fkey";

-- RenameIndex
ALTER INDEX "pov_ingredient_replacements_option_value_id_idx" RENAME TO "product_option_value_ingredient_replacements_option_value_i_idx";

-- RenameIndex
ALTER INDEX "pov_ingredient_replacements_replaced_ingredient_id_idx" RENAME TO "product_option_value_ingredient_replacements_replaced_ingre_idx";

-- RenameIndex
ALTER INDEX "pov_ingredient_replacements_replacement_ingredient_id_idx" RENAME TO "product_option_value_ingredient_replacements_replacement_in_idx";

-- RenameIndex
ALTER INDEX "pov_ingredient_replacements_value_replaced_key" RENAME TO "product_option_value_ingredient_replacements_option_value_i_key";

-- RenameIndex
ALTER INDEX "product_option_value_ingredients_option_value_id_ingredient_id_" RENAME TO "product_option_value_ingredients_option_value_id_ingredient_key";

-- Composite keys let PostgreSQL reject references whose IDs belong to a
-- different organization or outlet, even if a caller omits that check.
CREATE UNIQUE INDEX "categories_id_organization_id_key" ON "categories"("id", "organization_id");
CREATE UNIQUE INDEX "products_id_organization_id_key" ON "products"("id", "organization_id");
CREATE UNIQUE INDEX "product_variants_id_organization_id_key" ON "product_variants"("id", "organization_id");
CREATE UNIQUE INDEX "ingredients_id_organization_id_key" ON "ingredients"("id", "organization_id");
CREATE UNIQUE INDEX "accounts_id_organization_id_key" ON "accounts"("id", "organization_id");
CREATE UNIQUE INDEX "expense_categories_id_organization_id_key" ON "expense_categories"("id", "organization_id");
CREATE UNIQUE INDEX "orders_id_organization_id_outlet_id_key" ON "orders"("id", "organization_id", "outlet_id");
CREATE UNIQUE INDEX "dining_tables_id_organization_id_outlet_id_key" ON "dining_tables"("id", "organization_id", "outlet_id");

ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_category_tenant_fkey"
    FOREIGN KEY ("category_id", "organization_id") REFERENCES "categories"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_tenant_fkey"
    FOREIGN KEY ("product_id", "organization_id") REFERENCES "products"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_account_tenant_fkey"
    FOREIGN KEY ("account_id", "organization_id") REFERENCES "accounts"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_outlet_tenant_fkey" FOREIGN KEY ("organization_id", "outlet_id") REFERENCES "outlets"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_display_states" ADD CONSTRAINT "customer_display_states_outlet_tenant_fkey" FOREIGN KEY ("organization_id", "outlet_id") REFERENCES "outlets"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_outlet_tenant_fkey" FOREIGN KEY ("organization_id", "outlet_id") REFERENCES "outlets"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_tenant_fkey" FOREIGN KEY ("table_id", "organization_id", "outlet_id") REFERENCES "dining_tables"("id", "organization_id", "outlet_id") ON DELETE SET NULL ("table_id") ON UPDATE CASCADE;
ALTER TABLE "dining_tables" ADD CONSTRAINT "dining_tables_outlet_tenant_fkey" FOREIGN KEY ("organization_id", "outlet_id") REFERENCES "outlets"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_outlet_tenant_fkey" FOREIGN KEY ("organization_id", "outlet_id") REFERENCES "outlets"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_tenant_fkey" FOREIGN KEY ("order_id", "organization_id", "outlet_id") REFERENCES "orders"("id", "organization_id", "outlet_id") ON DELETE SET NULL ("order_id") ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_outlet_tenant_fkey" FOREIGN KEY ("organization_id", "outlet_id") REFERENCES "outlets"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_outlet_tenant_fkey" FOREIGN KEY ("organization_id", "outlet_id") REFERENCES "outlets"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_outlet_tenant_fkey" FOREIGN KEY ("organization_id", "outlet_id") REFERENCES "outlets"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_tenant_fkey" FOREIGN KEY ("category_id", "organization_id") REFERENCES "expense_categories"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_outlet_tenant_fkey" FOREIGN KEY ("organization_id", "outlet_id") REFERENCES "outlets"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_ledger_entries" ADD CONSTRAINT "cash_ledger_entries_outlet_tenant_fkey" FOREIGN KEY ("organization_id", "outlet_id") REFERENCES "outlets"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "daily_closes" ADD CONSTRAINT "daily_closes_outlet_tenant_fkey" FOREIGN KEY ("organization_id", "outlet_id") REFERENCES "outlets"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION enforce_outlet_product_tenant() RETURNS trigger AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM outlets o JOIN products p ON p.id = NEW.product_id
        WHERE o.id = NEW.outlet_id AND o.organization_id = p.organization_id
    ) THEN RAISE EXCEPTION 'Outlet product and product organization do not match' USING ERRCODE = '23514'; END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER outlet_products_tenant_guard BEFORE INSERT OR UPDATE OF outlet_id, product_id ON outlet_products
    FOR EACH ROW EXECUTE FUNCTION enforce_outlet_product_tenant();

CREATE OR REPLACE FUNCTION enforce_outlet_ingredient_tenant() RETURNS trigger AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM outlets o JOIN ingredients i ON i.id = NEW.ingredient_id
        WHERE o.id = NEW.outlet_id AND o.organization_id = i.organization_id
    ) THEN RAISE EXCEPTION 'Outlet ingredient stock and ingredient organization do not match' USING ERRCODE = '23514'; END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER outlet_ingredient_stocks_tenant_guard BEFORE INSERT OR UPDATE OF outlet_id, ingredient_id ON outlet_ingredient_stocks
    FOR EACH ROW EXECUTE FUNCTION enforce_outlet_ingredient_tenant();
