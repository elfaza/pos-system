CREATE TABLE "product_option_value_ingredients" (
  "id" TEXT NOT NULL,
  "option_value_id" TEXT NOT NULL,
  "ingredient_id" TEXT NOT NULL,
  "quantity_required" DECIMAL(12,3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "product_option_value_ingredients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_option_value_ingredients_option_value_id_ingredient_id_key"
  ON "product_option_value_ingredients"("option_value_id", "ingredient_id");

CREATE INDEX "product_option_value_ingredients_option_value_id_idx"
  ON "product_option_value_ingredients"("option_value_id");

CREATE INDEX "product_option_value_ingredients_ingredient_id_idx"
  ON "product_option_value_ingredients"("ingredient_id");

ALTER TABLE "product_option_value_ingredients"
  ADD CONSTRAINT "product_option_value_ingredients_option_value_id_fkey"
  FOREIGN KEY ("option_value_id") REFERENCES "product_option_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_option_value_ingredients"
  ADD CONSTRAINT "product_option_value_ingredients_ingredient_id_fkey"
  FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
