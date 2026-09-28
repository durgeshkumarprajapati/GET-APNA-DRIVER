-- CreateEnum
CREATE TYPE "recovery_attempt_status" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "driver_confirmation_response" AS ENUM ('STILL_TRAVELLING', 'ARRIVED', 'TEMPORARILY_DELAYED', 'UNABLE_TO_CONTINUE');

-- CreateTable
CREATE TABLE "trip_reliability_recovery_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "incident_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "status" "recovery_attempt_status" NOT NULL DEFAULT 'PENDING',
    "attempt_number" INTEGER NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "triggered_by" TEXT NOT NULL DEFAULT 'SYSTEM',
    "actor_user_id" UUID,
    "driver_response" "driver_confirmation_response",
    "failure_code" TEXT,
    "failure_summary" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_reliability_recovery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_reliability_recovery_attempts_idempotency_key_key" ON "trip_reliability_recovery_attempts"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "trip_reliability_recovery_attempts_incident_id_attempt_nu_key" ON "trip_reliability_recovery_attempts"("incident_id", "attempt_number");

-- CreateIndex
CREATE INDEX "trip_reliability_recovery_attempts_booking_id_status_idx" ON "trip_reliability_recovery_attempts"("booking_id", "status");

-- CreateIndex
CREATE INDEX "trip_reliability_recovery_attempts_status_started_at_idx" ON "trip_reliability_recovery_attempts"("status", "started_at");

-- AddForeignKey
ALTER TABLE "trip_reliability_recovery_attempts" ADD CONSTRAINT "trip_reliability_recovery_attempts_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "trip_reliability_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_reliability_recovery_attempts" ADD CONSTRAINT "trip_reliability_recovery_attempts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
