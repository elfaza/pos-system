-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'kitchen';
ALTER TYPE "UserRole" ADD VALUE 'queue';
ALTER TYPE "UserRole" ADD VALUE 'customer_facing_display';

-- CreateEnum
CREATE TYPE "CustomerDisplayStatus" AS ENUM ('idle', 'active', 'paid');

-- CreateTable
CREATE TABLE "customer_display_states" (
    "id" TEXT NOT NULL,
    "scope_key" TEXT NOT NULL DEFAULT 'default',
    "status" "CustomerDisplayStatus" NOT NULL DEFAULT 'idle',
    "store_name" TEXT NOT NULL DEFAULT '',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "paid_order_number" TEXT,
    "paid_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_display_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_display_states_scope_key_key" ON "customer_display_states"("scope_key");
