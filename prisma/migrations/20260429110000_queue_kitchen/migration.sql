CREATE TYPE "KitchenOrderStatus" AS ENUM ('received', 'preparing', 'ready', 'completed');

ALTER TABLE "orders"
  ADD COLUMN "queue_business_date" VARCHAR(10),
  ADD COLUMN "queue_number" INTEGER,
  ADD COLUMN "kitchen_status" "KitchenOrderStatus",
  ADD COLUMN "kitchen_preparing_at" TIMESTAMP(3),
  ADD COLUMN "kitchen_ready_at" TIMESTAMP(3),
  ADD COLUMN "kitchen_completed_at" TIMESTAMP(3);

CREATE INDEX "orders_kitchen_status_idx" ON "orders"("kitchen_status");
CREATE UNIQUE INDEX "orders_queue_business_date_queue_number_key" ON "orders"("queue_business_date", "queue_number");
