-- AlterTable
ALTER TABLE "customer_profiles" ADD COLUMN "customer_ride_pin_hash" TEXT,
ADD COLUMN "customer_ride_pin_created_at" TIMESTAMPTZ(6),
ADD COLUMN "customer_ride_pin_updated_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "ride_pin_verified_at" TIMESTAMPTZ(6),
ADD COLUMN "ride_pin_verified_by_driver_id" UUID,
ADD COLUMN "ride_pin_verification_attempt_count" INTEGER NOT NULL DEFAULT 0;
