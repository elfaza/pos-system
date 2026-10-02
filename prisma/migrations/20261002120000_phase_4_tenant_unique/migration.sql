-- Move operational and financial uniqueness to the tenant boundary. Tenant
-- columns remain nullable until the contract migration in Phase 6.
DROP INDEX IF EXISTS "orders_order_number_key";
DROP INDEX IF EXISTS "orders_queue_business_date_queue_number_key";
CREATE UNIQUE INDEX "orders_outlet_id_order_number_key" ON "orders"("outlet_id", "order_number");
CREATE UNIQUE INDEX "orders_outlet_id_queue_business_date_queue_number_key"
  ON "orders"("outlet_id", "queue_business_date", "queue_number");

DROP INDEX IF EXISTS "dining_tables_name_key";
CREATE UNIQUE INDEX "dining_tables_outlet_id_name_key" ON "dining_tables"("outlet_id", "name");

DROP INDEX IF EXISTS "accounts_code_key";
CREATE UNIQUE INDEX "accounts_organization_id_code_key" ON "accounts"("organization_id", "code");

DROP INDEX IF EXISTS "journal_entries_entry_number_key";
DROP INDEX IF EXISTS "journal_entries_source_type_source_id_key";
CREATE UNIQUE INDEX "journal_entries_outlet_id_entry_number_key" ON "journal_entries"("outlet_id", "entry_number");
CREATE UNIQUE INDEX "journal_entries_outlet_id_source_type_source_id_key"
  ON "journal_entries"("outlet_id", "source_type", "source_id");

DROP INDEX IF EXISTS "expense_categories_name_key";
CREATE UNIQUE INDEX "expense_categories_organization_id_name_key"
  ON "expense_categories"("organization_id", "name");

DROP INDEX IF EXISTS "cash_ledger_entries_source_type_source_id_key";
CREATE UNIQUE INDEX "cash_ledger_entries_outlet_id_source_type_source_id_key"
  ON "cash_ledger_entries"("outlet_id", "source_type", "source_id");

DROP INDEX IF EXISTS "daily_closes_business_date_key";
CREATE UNIQUE INDEX "daily_closes_outlet_id_business_date_key"
  ON "daily_closes"("outlet_id", "business_date");
