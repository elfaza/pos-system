ALTER TABLE "app_settings"
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'id-ID',
  ADD COLUMN "currency_code" TEXT NOT NULL DEFAULT 'IDR',
  ADD COLUMN "time_zone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  ADD COLUMN "business_day_start_time" TEXT NOT NULL DEFAULT '00:00',
  ADD COLUMN "cash_payment_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "qris_payment_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "kitchen_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "queue_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "inventory_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "accounting_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "reporting_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "receipt_printing_enabled" BOOLEAN NOT NULL DEFAULT true;
