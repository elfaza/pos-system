DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "organizations"
        WHERE "slug" = 'legacy-default'
          AND "id" <> 'org_legacy_default'
    ) THEN
        RAISE EXCEPTION 'Cannot restore the backfilled organization: slug legacy-default is already in use';
    END IF;

    UPDATE "organizations"
    SET "name" = 'Legacy',
        "slug" = 'legacy-default',
        "updated_at" = CURRENT_TIMESTAMP
    WHERE "id" = 'org_legacy_default';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cannot restore the backfilled organization: expected organization is missing';
    END IF;
END $$;
