-- Milestone 3 enforces the MVP rule that one order uses one payment record.
DROP INDEX IF EXISTS "payments_order_id_idx";
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");
