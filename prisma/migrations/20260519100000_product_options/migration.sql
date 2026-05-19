CREATE TYPE "ProductOptionSelectionType" AS ENUM ('single', 'multiple');

CREATE TABLE "product_option_groups" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "selection_type" "ProductOptionSelectionType" NOT NULL DEFAULT 'single',
  "is_required" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "product_option_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_option_values" (
  "id" TEXT NOT NULL,
  "group_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price_delta" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "product_option_values_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_item_option_selections" (
  "id" TEXT NOT NULL,
  "order_item_id" TEXT NOT NULL,
  "option_group_id" TEXT,
  "option_value_id" TEXT,
  "group_name_snapshot" TEXT NOT NULL,
  "value_name_snapshot" TEXT NOT NULL,
  "price_delta" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_item_option_selections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_option_groups_product_id_idx" ON "product_option_groups"("product_id");
CREATE INDEX "product_option_groups_is_active_idx" ON "product_option_groups"("is_active");
CREATE INDEX "product_option_values_group_id_idx" ON "product_option_values"("group_id");
CREATE INDEX "product_option_values_is_active_idx" ON "product_option_values"("is_active");
CREATE INDEX "order_item_option_selections_order_item_id_idx" ON "order_item_option_selections"("order_item_id");
CREATE INDEX "order_item_option_selections_option_group_id_idx" ON "order_item_option_selections"("option_group_id");
CREATE INDEX "order_item_option_selections_option_value_id_idx" ON "order_item_option_selections"("option_value_id");

ALTER TABLE "product_option_groups"
  ADD CONSTRAINT "product_option_groups_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_option_values"
  ADD CONSTRAINT "product_option_values_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "product_option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_item_option_selections"
  ADD CONSTRAINT "order_item_option_selections_order_item_id_fkey"
  FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_item_option_selections"
  ADD CONSTRAINT "order_item_option_selections_option_group_id_fkey"
  FOREIGN KEY ("option_group_id") REFERENCES "product_option_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_item_option_selections"
  ADD CONSTRAINT "order_item_option_selections_option_value_id_fkey"
  FOREIGN KEY ("option_value_id") REFERENCES "product_option_values"("id") ON DELETE SET NULL ON UPDATE CASCADE;
