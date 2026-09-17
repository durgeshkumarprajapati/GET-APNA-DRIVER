-- CreateEnum
CREATE TYPE "dynamic_pricing_policy_status" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "dynamic_adjustment_amount" DECIMAL(12,4),
ADD COLUMN "dynamic_pricing_policy_id" UUID,
ADD COLUMN "dynamic_pricing_policy_version" INTEGER,
ADD COLUMN "pressure_state" TEXT;

-- CreateTable
CREATE TABLE "dynamic_pricing_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "dynamic_pricing_policy_status" NOT NULL DEFAULT 'DRAFT',
    "booking_type" "booking_type",
    "zone_id" TEXT,
    "minimum_pressure" TEXT NOT NULL DEFAULT 'NORMAL',
    "maximum_pressure" TEXT NOT NULL DEFAULT 'CRITICAL',
    "adjustment_percentage" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "max_adjustment_percentage" DECIMAL(8,4) NOT NULL DEFAULT 50.00,
    "flat_surge_amount" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "effective_from" TIMESTAMPTZ(6),
    "effective_until" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dynamic_pricing_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dynamic_pricing_policies_status_booking_type_idx" ON "dynamic_pricing_policies"("status", "booking_type");

-- CreateIndex
CREATE INDEX "dynamic_pricing_policies_effective_from_effective_until_idx" ON "dynamic_pricing_policies"("effective_from", "effective_until");

-- CreateIndex
CREATE INDEX "bookings_driver_profile_id_hire_start_at_hire_end_at_stat_idx" ON "bookings"("driver_profile_id", "hire_start_at", "hire_end_at", "status");
