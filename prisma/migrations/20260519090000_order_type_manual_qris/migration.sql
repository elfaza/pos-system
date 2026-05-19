CREATE TYPE "OrderType" AS ENUM ('dine_in', 'takeaway', 'delivery');

ALTER TABLE "orders"
  ADD COLUMN "order_type" "OrderType" NOT NULL DEFAULT 'takeaway';

ALTER TABLE "app_settings"
  ALTER COLUMN "qris_payment_enabled" SET DEFAULT true;

UPDATE "app_settings"
SET "qris_payment_enabled" = true;
