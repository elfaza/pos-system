DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "organizations"
        WHERE "slug" = 'pajambon'
          AND "id" <> 'org_legacy_default'
    ) THEN
        RAISE EXCEPTION 'Cannot rename the backfilled organization: slug pajambon is already in use';
    END IF;

    UPDATE "organizations"
    SET "name" = 'Pajambon Organization',
        "slug" = 'pajambon',
        "updated_at" = CURRENT_TIMESTAMP
    WHERE "id" = 'org_legacy_default';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cannot rename the backfilled organization: expected organization is missing';
    END IF;
END $$;
