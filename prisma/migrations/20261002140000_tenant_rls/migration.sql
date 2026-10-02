DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pos_runtime') THEN
        CREATE ROLE pos_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    END IF;
END $$;

ALTER ROLE pos_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO pos_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pos_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pos_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pos_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO pos_runtime;

CREATE OR REPLACE FUNCTION tenant_scope_matches(row_organization_id text, row_outlet_id text)
RETURNS boolean
LANGUAGE sql STABLE AS $$
    SELECT row_organization_id = NULLIF(current_setting('app.organization_id', true), '')
       AND (row_outlet_id = NULLIF(current_setting('app.outlet_id', true), '')
            OR current_setting('app.organization_wide', true) = 'true')
$$;

-- Global identity and opaque session rows are deliberately outside tenant RLS:
-- login must find an identity before tenant context exists. Tenant-membership
-- reads use app.user_id and the authenticated auth service.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_self_or_member ON organizations
    USING (
        id = NULLIF(current_setting('app.organization_id', true), '')
        OR EXISTS (
            SELECT 1 FROM organization_memberships m
            WHERE m.organization_id = organizations.id
              AND m.user_id = NULLIF(current_setting('app.user_id', true), '')
        )
        OR EXISTS (
            SELECT 1 FROM outlet_memberships m
            WHERE m.organization_id = organizations.id
              AND m.user_id = NULLIF(current_setting('app.user_id', true), '')
        )
    )
    WITH CHECK (id = NULLIF(current_setting('app.organization_id', true), ''));

ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlets FORCE ROW LEVEL SECURITY;
CREATE POLICY outlet_self_or_member ON outlets
    USING (
        organization_id = NULLIF(current_setting('app.organization_id', true), '')
        OR EXISTS (
            SELECT 1 FROM outlet_memberships m
            WHERE m.outlet_id = outlets.id
              AND m.user_id = NULLIF(current_setting('app.user_id', true), '')
        )
        OR EXISTS (
            SELECT 1 FROM organization_memberships m
            WHERE m.organization_id = outlets.organization_id
              AND m.user_id = NULLIF(current_setting('app.user_id', true), '')
              AND m.role = 'owner'
        )
    )
    WITH CHECK (organization_id = NULLIF(current_setting('app.organization_id', true), ''));

ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_membership_self_or_tenant ON organization_memberships
    USING (
        user_id = NULLIF(current_setting('app.user_id', true), '')
        OR organization_id = NULLIF(current_setting('app.organization_id', true), '')
    )
    WITH CHECK (organization_id = NULLIF(current_setting('app.organization_id', true), ''));

ALTER TABLE outlet_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY outlet_membership_self_or_tenant ON outlet_memberships
    USING (
        user_id = NULLIF(current_setting('app.user_id', true), '')
        OR organization_id = NULLIF(current_setting('app.organization_id', true), '')
    )
    WITH CHECK (organization_id = NULLIF(current_setting('app.organization_id', true), ''));

DO $$
DECLARE
    tenant_table text;
    predicate text;
BEGIN
    FOR tenant_table, predicate IN
        SELECT * FROM (VALUES
            ('categories', 'organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')'),
            ('products', 'organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')'),
            ('product_variants', 'organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')'),
            ('ingredients', 'organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')'),
            ('accounts', 'organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')'),
            ('expense_categories', 'organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')'),
            ('app_settings', 'organization_id = NULLIF(current_setting(''app.organization_id'', true), '''') AND outlet_id = NULLIF(current_setting(''app.outlet_id'', true), '''')'),
            ('customer_display_states', 'organization_id = NULLIF(current_setting(''app.organization_id'', true), '''') AND outlet_id = NULLIF(current_setting(''app.outlet_id'', true), '''')'),
            ('orders', 'tenant_scope_matches(organization_id, outlet_id)'),
            ('dining_tables', 'tenant_scope_matches(organization_id, outlet_id)'),
            ('stock_movements', 'tenant_scope_matches(organization_id, outlet_id)'),
            ('activity_logs', 'tenant_scope_matches(organization_id, outlet_id)'),
            ('journal_entries', 'tenant_scope_matches(organization_id, outlet_id)'),
            ('expenses', 'tenant_scope_matches(organization_id, outlet_id)'),
            ('cash_movements', 'tenant_scope_matches(organization_id, outlet_id)'),
            ('cash_ledger_entries', 'tenant_scope_matches(organization_id, outlet_id)'),
            ('daily_closes', 'tenant_scope_matches(organization_id, outlet_id)')
        ) AS policies(table_name, using_predicate)
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant_table);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tenant_table);
        EXECUTE format('CREATE POLICY tenant_scope ON %I USING (%s) WITH CHECK (%s)', tenant_table, predicate, predicate);
    END LOOP;
END $$;

ALTER TABLE product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_groups FORCE ROW LEVEL SECURITY;
CREATE POLICY product_option_group_tenant ON product_option_groups
    USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_option_groups.product_id AND p.organization_id = NULLIF(current_setting('app.organization_id', true), '')))
    WITH CHECK (EXISTS (SELECT 1 FROM products p WHERE p.id = product_option_groups.product_id AND p.organization_id = NULLIF(current_setting('app.organization_id', true), '')));

ALTER TABLE product_option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_values FORCE ROW LEVEL SECURITY;
CREATE POLICY product_option_value_tenant ON product_option_values
    USING (EXISTS (SELECT 1 FROM product_option_groups g JOIN products p ON p.id = g.product_id WHERE g.id = product_option_values.group_id AND p.organization_id = NULLIF(current_setting('app.organization_id', true), '')))
    WITH CHECK (EXISTS (SELECT 1 FROM product_option_groups g JOIN products p ON p.id = g.product_id WHERE g.id = product_option_values.group_id AND p.organization_id = NULLIF(current_setting('app.organization_id', true), '')));

ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients FORCE ROW LEVEL SECURITY;
CREATE POLICY product_ingredient_tenant ON product_ingredients
    USING (
        EXISTS (SELECT 1 FROM products p WHERE p.id = product_ingredients.product_id AND p.organization_id = NULLIF(current_setting('app.organization_id', true), ''))
        AND EXISTS (SELECT 1 FROM ingredients i WHERE i.id = product_ingredients.ingredient_id AND i.organization_id = NULLIF(current_setting('app.organization_id', true), ''))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM products p WHERE p.id = product_ingredients.product_id AND p.organization_id = NULLIF(current_setting('app.organization_id', true), ''))
        AND EXISTS (SELECT 1 FROM ingredients i WHERE i.id = product_ingredients.ingredient_id AND i.organization_id = NULLIF(current_setting('app.organization_id', true), ''))
    );

ALTER TABLE product_option_value_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_value_ingredients FORCE ROW LEVEL SECURITY;
CREATE POLICY option_ingredient_tenant ON product_option_value_ingredients
    USING (
        EXISTS (SELECT 1 FROM product_option_values v JOIN product_option_groups g ON g.id = v.group_id JOIN products p ON p.id = g.product_id WHERE v.id = product_option_value_ingredients.option_value_id AND p.organization_id = NULLIF(current_setting('app.organization_id', true), ''))
        AND EXISTS (SELECT 1 FROM ingredients i WHERE i.id = product_option_value_ingredients.ingredient_id AND i.organization_id = NULLIF(current_setting('app.organization_id', true), ''))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM product_option_values v JOIN product_option_groups g ON g.id = v.group_id JOIN products p ON p.id = g.product_id WHERE v.id = product_option_value_ingredients.option_value_id AND p.organization_id = NULLIF(current_setting('app.organization_id', true), ''))
        AND EXISTS (SELECT 1 FROM ingredients i WHERE i.id = product_option_value_ingredients.ingredient_id AND i.organization_id = NULLIF(current_setting('app.organization_id', true), ''))
    );

ALTER TABLE product_option_value_ingredient_replacements ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_value_ingredient_replacements FORCE ROW LEVEL SECURITY;
CREATE POLICY option_replacement_tenant ON product_option_value_ingredient_replacements
    USING (
        EXISTS (SELECT 1 FROM product_option_values v JOIN product_option_groups g ON g.id = v.group_id JOIN products p ON p.id = g.product_id WHERE v.id = product_option_value_ingredient_replacements.option_value_id AND p.organization_id = NULLIF(current_setting('app.organization_id', true), ''))
        AND EXISTS (SELECT 1 FROM ingredients i WHERE i.id = product_option_value_ingredient_replacements.replaced_ingredient_id AND i.organization_id = NULLIF(current_setting('app.organization_id', true), ''))
        AND EXISTS (SELECT 1 FROM ingredients i WHERE i.id = product_option_value_ingredient_replacements.replacement_ingredient_id AND i.organization_id = NULLIF(current_setting('app.organization_id', true), ''))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM product_option_values v JOIN product_option_groups g ON g.id = v.group_id JOIN products p ON p.id = g.product_id WHERE v.id = product_option_value_ingredient_replacements.option_value_id AND p.organization_id = NULLIF(current_setting('app.organization_id', true), ''))
        AND EXISTS (SELECT 1 FROM ingredients i WHERE i.id = product_option_value_ingredient_replacements.replaced_ingredient_id AND i.organization_id = NULLIF(current_setting('app.organization_id', true), ''))
        AND EXISTS (SELECT 1 FROM ingredients i WHERE i.id = product_option_value_ingredient_replacements.replacement_ingredient_id AND i.organization_id = NULLIF(current_setting('app.organization_id', true), ''))
    );

ALTER TABLE outlet_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_products FORCE ROW LEVEL SECURITY;
CREATE POLICY outlet_product_tenant ON outlet_products
    USING (
        outlet_id = NULLIF(current_setting('app.outlet_id', true), '')
        AND EXISTS (SELECT 1 FROM outlets o JOIN products p ON p.id = outlet_products.product_id WHERE o.id = outlet_products.outlet_id AND o.organization_id = NULLIF(current_setting('app.organization_id', true), '') AND p.organization_id = o.organization_id)
    )
    WITH CHECK (
        outlet_id = NULLIF(current_setting('app.outlet_id', true), '')
        AND EXISTS (SELECT 1 FROM outlets o JOIN products p ON p.id = outlet_products.product_id WHERE o.id = outlet_products.outlet_id AND o.organization_id = NULLIF(current_setting('app.organization_id', true), '') AND p.organization_id = o.organization_id)
    );

ALTER TABLE outlet_ingredient_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_ingredient_stocks FORCE ROW LEVEL SECURITY;
CREATE POLICY outlet_ingredient_stock_tenant ON outlet_ingredient_stocks
    USING (
        outlet_id = NULLIF(current_setting('app.outlet_id', true), '')
        AND EXISTS (SELECT 1 FROM outlets o JOIN ingredients i ON i.id = outlet_ingredient_stocks.ingredient_id WHERE o.id = outlet_ingredient_stocks.outlet_id AND o.organization_id = NULLIF(current_setting('app.organization_id', true), '') AND i.organization_id = o.organization_id)
    )
    WITH CHECK (
        outlet_id = NULLIF(current_setting('app.outlet_id', true), '')
        AND EXISTS (SELECT 1 FROM outlets o JOIN ingredients i ON i.id = outlet_ingredient_stocks.ingredient_id WHERE o.id = outlet_ingredient_stocks.outlet_id AND o.organization_id = NULLIF(current_setting('app.organization_id', true), '') AND i.organization_id = o.organization_id)
    );

DO $$
DECLARE
    tenant_table text;
    predicate text;
BEGIN
    FOR tenant_table, predicate IN
        SELECT * FROM (VALUES
            ('order_items', 'EXISTS (SELECT 1 FROM orders o JOIN products p ON p.id = order_items.product_id WHERE o.id = order_items.order_id AND tenant_scope_matches(o.organization_id, o.outlet_id) AND p.organization_id = o.organization_id)'),
            ('payments', 'EXISTS (SELECT 1 FROM orders o WHERE o.id = payments.order_id AND tenant_scope_matches(o.organization_id, o.outlet_id))'),
            ('refunds', 'EXISTS (SELECT 1 FROM orders o WHERE o.id = refunds.order_id AND tenant_scope_matches(o.organization_id, o.outlet_id))'),
            ('journal_entry_lines', 'EXISTS (SELECT 1 FROM journal_entries j JOIN accounts a ON a.id = journal_entry_lines.account_id WHERE j.id = journal_entry_lines.journal_entry_id AND tenant_scope_matches(j.organization_id, j.outlet_id) AND a.organization_id = j.organization_id)')
        ) AS policies(table_name, using_predicate)
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant_table);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tenant_table);
        EXECUTE format('CREATE POLICY tenant_scope ON %I USING (%s) WITH CHECK (%s)', tenant_table, predicate, predicate);
    END LOOP;
END $$;

ALTER TABLE order_item_option_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_option_selections FORCE ROW LEVEL SECURITY;
CREATE POLICY order_option_selection_tenant ON order_item_option_selections
    USING (
        EXISTS (SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.id = order_item_option_selections.order_item_id AND tenant_scope_matches(o.organization_id, o.outlet_id))
        AND (option_group_id IS NULL OR EXISTS (SELECT 1 FROM product_option_groups g JOIN products p ON p.id = g.product_id WHERE g.id = order_item_option_selections.option_group_id AND p.organization_id = NULLIF(current_setting('app.organization_id', true), '')))
        AND (option_value_id IS NULL OR EXISTS (SELECT 1 FROM product_option_values v JOIN product_option_groups g ON g.id = v.group_id JOIN products p ON p.id = g.product_id WHERE v.id = order_item_option_selections.option_value_id AND p.organization_id = NULLIF(current_setting('app.organization_id', true), '')))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.id = order_item_option_selections.order_item_id AND tenant_scope_matches(o.organization_id, o.outlet_id))
        AND (option_group_id IS NULL OR EXISTS (SELECT 1 FROM product_option_groups g JOIN products p ON p.id = g.product_id WHERE g.id = order_item_option_selections.option_group_id AND p.organization_id = NULLIF(current_setting('app.organization_id', true), '')))
        AND (option_value_id IS NULL OR EXISTS (SELECT 1 FROM product_option_values v JOIN product_option_groups g ON g.id = v.group_id JOIN products p ON p.id = g.product_id WHERE v.id = order_item_option_selections.option_value_id AND p.organization_id = NULLIF(current_setting('app.organization_id', true), '')))
    );
