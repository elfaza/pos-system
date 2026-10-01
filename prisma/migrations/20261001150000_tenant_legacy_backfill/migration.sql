BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM "organizations"
        WHERE "id" = 'org_legacy_default' AND "slug" <> 'legacy-default'
    ) OR EXISTS (
        SELECT 1 FROM "organizations"
        WHERE "slug" = 'legacy-default' AND "id" <> 'org_legacy_default'
    ) THEN
        RAISE EXCEPTION 'Conflicting legacy organization identity';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "outlets"
        WHERE "id" = 'outlet_legacy_default'
          AND ("organization_id" <> 'org_legacy_default' OR "slug" <> 'main')
    ) OR EXISTS (
        SELECT 1 FROM "outlets"
        WHERE "organization_id" = 'org_legacy_default'
          AND "slug" = 'main'
          AND "id" <> 'outlet_legacy_default'
    ) THEN
        RAISE EXCEPTION 'Conflicting legacy outlet identity';
    END IF;
END $$;

INSERT INTO "organizations" ("id", "name", "slug", "is_active", "created_at", "updated_at")
VALUES ('org_legacy_default', 'Legacy Organization', 'legacy-default', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "outlets" ("id", "organization_id", "name", "slug", "time_zone", "is_active", "created_at", "updated_at")
VALUES ('outlet_legacy_default', 'org_legacy_default', 'Main Outlet', 'main', 'Asia/Jakarta', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

DO $$
DECLARE
    scoped_row RECORD;
    has_conflict BOOLEAN;
BEGIN
    FOR scoped_row IN
        SELECT * FROM (VALUES
            ('categories', 'organization_id', 'org_legacy_default'),
            ('products', 'organization_id', 'org_legacy_default'),
            ('product_variants', 'organization_id', 'org_legacy_default'),
            ('ingredients', 'organization_id', 'org_legacy_default'),
            ('accounts', 'organization_id', 'org_legacy_default'),
            ('expense_categories', 'organization_id', 'org_legacy_default'),
            ('app_settings', 'organization_id', 'org_legacy_default'),
            ('app_settings', 'outlet_id', 'outlet_legacy_default'),
            ('customer_display_states', 'organization_id', 'org_legacy_default'),
            ('customer_display_states', 'outlet_id', 'outlet_legacy_default'),
            ('orders', 'organization_id', 'org_legacy_default'),
            ('orders', 'outlet_id', 'outlet_legacy_default'),
            ('dining_tables', 'organization_id', 'org_legacy_default'),
            ('dining_tables', 'outlet_id', 'outlet_legacy_default'),
            ('stock_movements', 'organization_id', 'org_legacy_default'),
            ('stock_movements', 'outlet_id', 'outlet_legacy_default'),
            ('activity_logs', 'organization_id', 'org_legacy_default'),
            ('activity_logs', 'outlet_id', 'outlet_legacy_default'),
            ('journal_entries', 'organization_id', 'org_legacy_default'),
            ('journal_entries', 'outlet_id', 'outlet_legacy_default'),
            ('expenses', 'organization_id', 'org_legacy_default'),
            ('expenses', 'outlet_id', 'outlet_legacy_default'),
            ('cash_movements', 'organization_id', 'org_legacy_default'),
            ('cash_movements', 'outlet_id', 'outlet_legacy_default'),
            ('cash_ledger_entries', 'organization_id', 'org_legacy_default'),
            ('cash_ledger_entries', 'outlet_id', 'outlet_legacy_default'),
            ('daily_closes', 'organization_id', 'org_legacy_default'),
            ('daily_closes', 'outlet_id', 'outlet_legacy_default')
        ) AS scope(table_name, column_name, expected_id)
    LOOP
        EXECUTE format(
            'SELECT EXISTS (SELECT 1 FROM %I WHERE %I IS NOT NULL AND %I <> $1)',
            scoped_row.table_name,
            scoped_row.column_name,
            scoped_row.column_name
        ) INTO has_conflict USING scoped_row.expected_id;

        IF has_conflict THEN
            RAISE EXCEPTION 'Conflicting tenant assignment in %.%',
                scoped_row.table_name,
                scoped_row.column_name;
        END IF;
    END LOOP;

    IF EXISTS (
        SELECT 1
        FROM "outlet_products" AS outlet_product
        JOIN "products" AS product ON product."id" = outlet_product."product_id"
        WHERE outlet_product."outlet_id" = 'outlet_legacy_default'
          AND (outlet_product."is_available" IS DISTINCT FROM product."is_available"
            OR outlet_product."stock_quantity" IS DISTINCT FROM product."stock_quantity"
            OR outlet_product."low_stock_threshold" IS DISTINCT FROM product."low_stock_threshold")
    ) THEN
        RAISE EXCEPTION 'Conflicting legacy outlet product stock';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "outlet_ingredient_stocks" AS outlet_stock
        JOIN "ingredients" AS ingredient ON ingredient."id" = outlet_stock."ingredient_id"
        WHERE outlet_stock."outlet_id" = 'outlet_legacy_default'
          AND (outlet_stock."current_stock" IS DISTINCT FROM ingredient."current_stock"
            OR outlet_stock."low_stock_threshold" IS DISTINCT FROM ingredient."low_stock_threshold")
    ) THEN
        RAISE EXCEPTION 'Conflicting legacy outlet ingredient stock';
    END IF;
END $$;

UPDATE "categories" SET "organization_id" = 'org_legacy_default' WHERE "organization_id" IS NULL;
UPDATE "products" SET "organization_id" = 'org_legacy_default' WHERE "organization_id" IS NULL;
UPDATE "product_variants" SET "organization_id" = 'org_legacy_default' WHERE "organization_id" IS NULL;
UPDATE "ingredients" SET "organization_id" = 'org_legacy_default' WHERE "organization_id" IS NULL;
UPDATE "accounts" SET "organization_id" = 'org_legacy_default' WHERE "organization_id" IS NULL;
UPDATE "expense_categories" SET "organization_id" = 'org_legacy_default' WHERE "organization_id" IS NULL;

UPDATE "app_settings"
SET "organization_id" = 'org_legacy_default', "outlet_id" = 'outlet_legacy_default'
WHERE "organization_id" IS NULL OR "outlet_id" IS NULL;
UPDATE "customer_display_states"
SET "organization_id" = 'org_legacy_default', "outlet_id" = 'outlet_legacy_default'
WHERE "organization_id" IS NULL OR "outlet_id" IS NULL;
UPDATE "orders"
SET "organization_id" = 'org_legacy_default', "outlet_id" = 'outlet_legacy_default'
WHERE "organization_id" IS NULL OR "outlet_id" IS NULL;
UPDATE "dining_tables"
SET "organization_id" = 'org_legacy_default', "outlet_id" = 'outlet_legacy_default'
WHERE "organization_id" IS NULL OR "outlet_id" IS NULL;
UPDATE "stock_movements"
SET "organization_id" = 'org_legacy_default', "outlet_id" = 'outlet_legacy_default'
WHERE "organization_id" IS NULL OR "outlet_id" IS NULL;
UPDATE "activity_logs"
SET "organization_id" = 'org_legacy_default', "outlet_id" = 'outlet_legacy_default'
WHERE "organization_id" IS NULL OR "outlet_id" IS NULL;
UPDATE "journal_entries"
SET "organization_id" = 'org_legacy_default', "outlet_id" = 'outlet_legacy_default'
WHERE "organization_id" IS NULL OR "outlet_id" IS NULL;
UPDATE "expenses"
SET "organization_id" = 'org_legacy_default', "outlet_id" = 'outlet_legacy_default'
WHERE "organization_id" IS NULL OR "outlet_id" IS NULL;
UPDATE "cash_movements"
SET "organization_id" = 'org_legacy_default', "outlet_id" = 'outlet_legacy_default'
WHERE "organization_id" IS NULL OR "outlet_id" IS NULL;
UPDATE "cash_ledger_entries"
SET "organization_id" = 'org_legacy_default', "outlet_id" = 'outlet_legacy_default'
WHERE "organization_id" IS NULL OR "outlet_id" IS NULL;
UPDATE "daily_closes"
SET "organization_id" = 'org_legacy_default', "outlet_id" = 'outlet_legacy_default'
WHERE "organization_id" IS NULL OR "outlet_id" IS NULL;

INSERT INTO "organization_memberships" (
    "id", "organization_id", "user_id", "role", "is_active", "created_at", "updated_at"
)
SELECT
    'legacy_org_member_' || md5(legacy_user."id"),
    'org_legacy_default',
    legacy_user."id",
    'owner'::"OrganizationRole",
    legacy_user."is_active",
    legacy_user."created_at",
    legacy_user."updated_at"
FROM "users" AS legacy_user
WHERE legacy_user."role"::TEXT = 'admin'
ON CONFLICT ("organization_id", "user_id") DO NOTHING;

INSERT INTO "outlet_memberships" (
    "id", "organization_id", "outlet_id", "user_id", "role", "is_active", "created_at", "updated_at"
)
SELECT
    'legacy_outlet_member_' || md5(legacy_user."id"),
    'org_legacy_default',
    'outlet_legacy_default',
    legacy_user."id",
    legacy_user."role"::TEXT::"OutletRole",
    legacy_user."is_active",
    legacy_user."created_at",
    legacy_user."updated_at"
FROM "users" AS legacy_user
ON CONFLICT ("outlet_id", "user_id") DO NOTHING;

INSERT INTO "outlet_products" (
    "id", "outlet_id", "product_id", "is_available", "stock_quantity", "low_stock_threshold", "created_at", "updated_at"
)
SELECT
    'legacy_product_' || md5(product."id"),
    'outlet_legacy_default',
    product."id",
    product."is_available",
    product."stock_quantity",
    product."low_stock_threshold",
    product."created_at",
    product."updated_at"
FROM "products" AS product
ON CONFLICT ("outlet_id", "product_id") DO NOTHING;

INSERT INTO "outlet_ingredient_stocks" (
    "id", "outlet_id", "ingredient_id", "current_stock", "low_stock_threshold", "created_at", "updated_at"
)
SELECT
    'legacy_ingredient_' || md5(ingredient."id"),
    'outlet_legacy_default',
    ingredient."id",
    ingredient."current_stock",
    ingredient."low_stock_threshold",
    ingredient."created_at",
    ingredient."updated_at"
FROM "ingredients" AS ingredient
ON CONFLICT ("outlet_id", "ingredient_id") DO NOTHING;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM "sessions"
        WHERE ("active_organization_id" IS NOT NULL AND "active_organization_id" <> 'org_legacy_default')
           OR ("active_outlet_id" IS NOT NULL AND "active_outlet_id" <> 'outlet_legacy_default')
    ) THEN
        RAISE EXCEPTION 'Conflicting legacy session tenant context';
    END IF;
END $$;

UPDATE "sessions"
SET "active_organization_id" = 'org_legacy_default',
    "active_outlet_id" = 'outlet_legacy_default'
WHERE "active_organization_id" IS NULL OR "active_outlet_id" IS NULL;

COMMIT;
