-- Add nullable tenant keys and per-outlet inventory without changing current reads.
ALTER TABLE "categories" ADD COLUMN "organization_id" TEXT;
ALTER TABLE "products" ADD COLUMN "organization_id" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "organization_id" TEXT;
ALTER TABLE "ingredients" ADD COLUMN "organization_id" TEXT;
ALTER TABLE "accounts" ADD COLUMN "organization_id" TEXT;
ALTER TABLE "expense_categories" ADD COLUMN "organization_id" TEXT;

ALTER TABLE "app_settings"
    ADD COLUMN "organization_id" TEXT,
    ADD COLUMN "outlet_id" TEXT;
ALTER TABLE "customer_display_states"
    ADD COLUMN "organization_id" TEXT,
    ADD COLUMN "outlet_id" TEXT;
ALTER TABLE "orders"
    ADD COLUMN "organization_id" TEXT,
    ADD COLUMN "outlet_id" TEXT;
ALTER TABLE "dining_tables"
    ADD COLUMN "organization_id" TEXT,
    ADD COLUMN "outlet_id" TEXT;
ALTER TABLE "stock_movements"
    ADD COLUMN "organization_id" TEXT,
    ADD COLUMN "outlet_id" TEXT;
ALTER TABLE "activity_logs"
    ADD COLUMN "organization_id" TEXT,
    ADD COLUMN "outlet_id" TEXT;
ALTER TABLE "journal_entries"
    ADD COLUMN "organization_id" TEXT,
    ADD COLUMN "outlet_id" TEXT;
ALTER TABLE "expenses"
    ADD COLUMN "organization_id" TEXT,
    ADD COLUMN "outlet_id" TEXT;
ALTER TABLE "cash_movements"
    ADD COLUMN "organization_id" TEXT,
    ADD COLUMN "outlet_id" TEXT;
ALTER TABLE "cash_ledger_entries"
    ADD COLUMN "organization_id" TEXT,
    ADD COLUMN "outlet_id" TEXT;
ALTER TABLE "daily_closes"
    ADD COLUMN "organization_id" TEXT,
    ADD COLUMN "outlet_id" TEXT;

CREATE TABLE "outlet_products" (
    "id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "price_override" DECIMAL(12,2),
    "stock_quantity" DECIMAL(12,3),
    "low_stock_threshold" DECIMAL(12,3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "outlet_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outlet_ingredient_stocks" (
    "id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "current_stock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "low_stock_threshold" DECIMAL(12,3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "outlet_ingredient_stocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outlet_products_outlet_id_product_id_key" ON "outlet_products"("outlet_id", "product_id");
CREATE INDEX "outlet_products_product_id_idx" ON "outlet_products"("product_id");
CREATE UNIQUE INDEX "outlet_ingredient_stocks_outlet_id_ingredient_id_key" ON "outlet_ingredient_stocks"("outlet_id", "ingredient_id");
CREATE INDEX "outlet_ingredient_stocks_ingredient_id_idx" ON "outlet_ingredient_stocks"("ingredient_id");

CREATE INDEX "categories_organization_id_is_active_idx" ON "categories"("organization_id", "is_active");
CREATE INDEX "products_organization_id_category_id_idx" ON "products"("organization_id", "category_id");
CREATE INDEX "products_organization_id_is_available_idx" ON "products"("organization_id", "is_available");
CREATE INDEX "product_variants_organization_id_product_id_idx" ON "product_variants"("organization_id", "product_id");
CREATE INDEX "ingredients_organization_id_is_active_idx" ON "ingredients"("organization_id", "is_active");
CREATE INDEX "accounts_organization_id_type_idx" ON "accounts"("organization_id", "type");
CREATE INDEX "expense_categories_organization_id_is_active_idx" ON "expense_categories"("organization_id", "is_active");
CREATE INDEX "app_settings_organization_id_outlet_id_idx" ON "app_settings"("organization_id", "outlet_id");
CREATE INDEX "customer_display_states_organization_id_outlet_id_idx" ON "customer_display_states"("organization_id", "outlet_id");
CREATE INDEX "orders_organization_id_outlet_id_status_idx" ON "orders"("organization_id", "outlet_id", "status");
CREATE INDEX "orders_organization_id_outlet_id_kitchen_status_idx" ON "orders"("organization_id", "outlet_id", "kitchen_status");
CREATE INDEX "orders_organization_id_outlet_id_queue_business_date_idx" ON "orders"("organization_id", "outlet_id", "queue_business_date");
CREATE INDEX "orders_organization_id_outlet_id_created_at_idx" ON "orders"("organization_id", "outlet_id", "created_at");
CREATE INDEX "orders_organization_id_outlet_id_paid_at_idx" ON "orders"("organization_id", "outlet_id", "paid_at");
CREATE INDEX "orders_organization_id_outlet_id_kitchen_ready_at_idx" ON "orders"("organization_id", "outlet_id", "kitchen_ready_at");
CREATE INDEX "dining_tables_organization_id_outlet_id_is_active_idx" ON "dining_tables"("organization_id", "outlet_id", "is_active");
CREATE INDEX "stock_movements_organization_id_outlet_id_created_at_idx" ON "stock_movements"("organization_id", "outlet_id", "created_at");
CREATE INDEX "activity_logs_organization_id_outlet_id_created_at_idx" ON "activity_logs"("organization_id", "outlet_id", "created_at");
CREATE INDEX "journal_entries_organization_id_outlet_id_business_date_idx" ON "journal_entries"("organization_id", "outlet_id", "business_date");
CREATE INDEX "expenses_organization_id_outlet_id_business_date_idx" ON "expenses"("organization_id", "outlet_id", "business_date");
CREATE INDEX "cash_movements_organization_id_outlet_id_business_date_idx" ON "cash_movements"("organization_id", "outlet_id", "business_date");
CREATE INDEX "cash_ledger_entries_organization_id_outlet_id_business_date_idx" ON "cash_ledger_entries"("organization_id", "outlet_id", "business_date");
CREATE INDEX "daily_closes_organization_id_outlet_id_business_date_idx" ON "daily_closes"("organization_id", "outlet_id", "business_date");

ALTER TABLE "outlet_products"
    ADD CONSTRAINT "outlet_products_outlet_id_fkey"
    FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "outlet_products_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outlet_ingredient_stocks"
    ADD CONSTRAINT "outlet_ingredient_stocks_outlet_id_fkey"
    FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "outlet_ingredient_stocks_ingredient_id_fkey"
    FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
