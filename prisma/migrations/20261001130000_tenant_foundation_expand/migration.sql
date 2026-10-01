-- Add the identity and membership foundation while preserving the legacy role.
CREATE TYPE "OrganizationRole" AS ENUM ('owner', 'admin');
CREATE TYPE "OutletRole" AS ENUM ('admin', 'cashier', 'kitchen', 'queue', 'customer_facing_display');

CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outlets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "time_zone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "outlets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_memberships" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outlet_memberships" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "OutletRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "outlet_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX "outlets_organization_id_slug_key" ON "outlets"("organization_id", "slug");
CREATE UNIQUE INDEX "outlets_organization_id_id_key" ON "outlets"("organization_id", "id");
CREATE INDEX "outlets_organization_id_is_active_idx" ON "outlets"("organization_id", "is_active");
CREATE UNIQUE INDEX "organization_memberships_organization_id_user_id_key" ON "organization_memberships"("organization_id", "user_id");
CREATE INDEX "organization_memberships_user_id_is_active_idx" ON "organization_memberships"("user_id", "is_active");
CREATE INDEX "organization_memberships_organization_id_role_is_active_idx" ON "organization_memberships"("organization_id", "role", "is_active");
CREATE UNIQUE INDEX "outlet_memberships_outlet_id_user_id_key" ON "outlet_memberships"("outlet_id", "user_id");
CREATE INDEX "outlet_memberships_user_id_is_active_idx" ON "outlet_memberships"("user_id", "is_active");
CREATE INDEX "outlet_memberships_organization_id_outlet_id_role_is_active_idx" ON "outlet_memberships"("organization_id", "outlet_id", "role", "is_active");

ALTER TABLE "sessions"
    ADD COLUMN "active_organization_id" TEXT,
    ADD COLUMN "active_outlet_id" TEXT;
CREATE INDEX "sessions_active_organization_id_active_outlet_id_idx"
    ON "sessions"("active_organization_id", "active_outlet_id");

ALTER TABLE "outlets"
    ADD CONSTRAINT "outlets_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_memberships"
    ADD CONSTRAINT "organization_memberships_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "organization_memberships_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outlet_memberships"
    ADD CONSTRAINT "outlet_memberships_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "outlet_memberships_organization_id_outlet_id_fkey"
    FOREIGN KEY ("organization_id", "outlet_id") REFERENCES "outlets"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "outlet_memberships_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
