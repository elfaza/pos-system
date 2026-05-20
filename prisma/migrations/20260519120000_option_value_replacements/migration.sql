-- CreateTable
CREATE TABLE "product_option_value_ingredient_replacements" (
    "id" TEXT NOT NULL,
    "option_value_id" TEXT NOT NULL,
    "replaced_ingredient_id" TEXT NOT NULL,
    "replacement_ingredient_id" TEXT NOT NULL,
    "quantity_required" DECIMAL(12,3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pov_ingredient_replacements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pov_ingredient_replacements_option_value_id_idx" ON "product_option_value_ingredient_replacements"("option_value_id");

-- CreateIndex
CREATE INDEX "pov_ingredient_replacements_replaced_ingredient_id_idx" ON "product_option_value_ingredient_replacements"("replaced_ingredient_id");

-- CreateIndex
CREATE INDEX "pov_ingredient_replacements_replacement_ingredient_id_idx" ON "product_option_value_ingredient_replacements"("replacement_ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "pov_ingredient_replacements_value_replaced_key" ON "product_option_value_ingredient_replacements"("option_value_id", "replaced_ingredient_id");

-- AddForeignKey
ALTER TABLE "product_option_value_ingredient_replacements" ADD CONSTRAINT "pov_ingredient_replacements_option_value_id_fkey" FOREIGN KEY ("option_value_id") REFERENCES "product_option_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_option_value_ingredient_replacements" ADD CONSTRAINT "pov_ingredient_replacements_replaced_id_fkey" FOREIGN KEY ("replaced_ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_option_value_ingredient_replacements" ADD CONSTRAINT "pov_ingredient_replacements_replacement_id_fkey" FOREIGN KEY ("replacement_ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
