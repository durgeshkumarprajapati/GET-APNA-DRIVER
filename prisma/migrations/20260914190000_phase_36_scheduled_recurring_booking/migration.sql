-- CreateEnum
CREATE TYPE "ScheduledRideStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('ONE_TIME', 'RECURRING');

-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'CUSTOM_DAYS');

-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('GENERATED', 'SKIPPED', 'FAILED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "scheduled_ride_id" UUID;

-- CreateTable
CREATE TABLE "scheduled_rides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "idempotency_key" TEXT,
    "customer_id" UUID NOT NULL,
    "status" "ScheduledRideStatus" NOT NULL DEFAULT 'ACTIVE',
    "schedule_type" "ScheduleType" NOT NULL DEFAULT 'ONE_TIME',
    "booking_type" "booking_type" NOT NULL DEFAULT 'ONE_WAY',
    "pickup_latitude" DOUBLE PRECISION NOT NULL,
    "pickup_longitude" DOUBLE PRECISION NOT NULL,
    "pickup_address" TEXT NOT NULL,
    "pickup_label" TEXT,
    "dropoff_latitude" DOUBLE PRECISION,
    "dropoff_longitude" DOUBLE PRECISION,
    "dropoff_address" TEXT,
    "dropoff_label" TEXT,
    "saved_location_id" UUID,
    "vehicle_category" TEXT DEFAULT 'SEDAN',
    "preferred_driver_profile_id" UUID,
    "promotion_code" TEXT,
    "scheduled_time" TEXT NOT NULL,
    "scheduled_date" TIMESTAMPTZ(6),
    "recurrence_frequency" "RecurrenceFrequency",
    "days_of_week" INTEGER[],
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "start_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_at" TIMESTAMPTZ(6),
    "next_occurrence_at" TIMESTAMPTZ(6),
    "last_generated_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "cancelled_at" TIMESTAMPTZ(6),

    CONSTRAINT "scheduled_rides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_ride_occurrence_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scheduled_ride_id" UUID NOT NULL,
    "occurrence_start" TIMESTAMPTZ(6) NOT NULL,
    "occurrence_idempotency_key" TEXT NOT NULL,
    "booking_id" UUID,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'GENERATED',
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_ride_occurrence_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_rides_idempotency_key_key" ON "scheduled_rides"("idempotency_key");

-- CreateIndex
CREATE INDEX "scheduled_rides_customer_id_status_idx" ON "scheduled_rides"("customer_id", "status");

-- CreateIndex
CREATE INDEX "scheduled_rides_status_next_occurrence_at_idx" ON "scheduled_rides"("status", "next_occurrence_at");

-- CreateIndex
CREATE INDEX "scheduled_rides_preferred_driver_profile_id_idx" ON "scheduled_rides"("preferred_driver_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_ride_occurrence_logs_occurrence_idempotency_key_key" ON "scheduled_ride_occurrence_logs"("occurrence_idempotency_key");

-- CreateIndex
CREATE INDEX "scheduled_ride_occurrence_logs_scheduled_ride_id_occurrence_start_idx" ON "scheduled_ride_occurrence_logs"("scheduled_ride_id", "occurrence_start");

-- CreateIndex
CREATE INDEX "bookings_scheduled_ride_id_idx" ON "bookings"("scheduled_ride_id");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_scheduled_ride_id_fkey" FOREIGN KEY ("scheduled_ride_id") REFERENCES "scheduled_rides"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_rides" ADD CONSTRAINT "scheduled_rides_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_rides" ADD CONSTRAINT "scheduled_rides_saved_location_id_fkey" FOREIGN KEY ("saved_location_id") REFERENCES "saved_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_rides" ADD CONSTRAINT "scheduled_rides_preferred_driver_profile_id_fkey" FOREIGN KEY ("preferred_driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_ride_occurrence_logs" ADD CONSTRAINT "scheduled_ride_occurrence_logs_scheduled_ride_id_fkey" FOREIGN KEY ("scheduled_ride_id") REFERENCES "scheduled_rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_ride_occurrence_logs" ADD CONSTRAINT "scheduled_ride_occurrence_logs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
