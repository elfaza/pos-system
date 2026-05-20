ALTER TABLE "app_settings"
  ADD COLUMN "dine_in_pay_later_enabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "dining_tables" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "dining_tables_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dining_tables_name_key" ON "dining_tables"("name");
CREATE INDEX "dining_tables_is_active_idx" ON "dining_tables"("is_active");

ALTER TABLE "orders"
  ADD COLUMN "table_id" TEXT,
  ADD COLUMN "delivery_customer_name" TEXT,
  ADD COLUMN "delivery_customer_phone" TEXT,
  ADD COLUMN "delivery_address" TEXT,
  ADD COLUMN "delivery_notes" TEXT;

CREATE INDEX "orders_table_id_idx" ON "orders"("table_id");

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_table_id_fkey"
  FOREIGN KEY ("table_id") REFERENCES "dining_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
