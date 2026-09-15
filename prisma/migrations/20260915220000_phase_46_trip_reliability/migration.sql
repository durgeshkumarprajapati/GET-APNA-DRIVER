-- CreateEnum
CREATE TYPE "trip_reliability_incident_type" AS ENUM ('ASSIGNMENT_TIMEOUT', 'DISPATCH_FAILURE', 'NO_DRIVER_AVAILABLE', 'DRIVER_LOCATION_STALE', 'DRIVER_NOT_MOVING', 'PICKUP_DELAY', 'CUSTOMER_UNREACHABLE', 'DRIVER_CANCELLED', 'TRIP_STUCK', 'SCHEDULED_RIDE_FAILURE', 'PAYMENT_RECONCILIATION', 'INVOICE_FAILURE', 'NOTIFICATION_FAILURE', 'SAFETY_ESCALATION', 'SUPPORT_ESCALATION');

-- CreateEnum
CREATE TYPE "trip_reliability_incident_severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "trip_reliability_incident_status" AS ENUM ('DETECTED', 'INVESTIGATING', 'CONFIRMED', 'RECOVERY_PENDING', 'RECOVERING', 'RESOLVED', 'ESCALATED', 'CLOSED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "trip_reliability_confidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "trip_reliability_incidents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "incident_number" TEXT NOT NULL,
    "booking_id" UUID NOT NULL,
    "customer_id" UUID,
    "driver_profile_id" UUID,
    "type" "trip_reliability_incident_type" NOT NULL,
    "severity" "trip_reliability_incident_severity" NOT NULL DEFAULT 'MEDIUM',
    "status" "trip_reliability_incident_status" NOT NULL DEFAULT 'DETECTED',
    "confidence" "trip_reliability_confidence" NOT NULL DEFAULT 'HIGH',
    "fingerprint" TEXT NOT NULL,
    "metadata" JSONB,
    "resolution_code" TEXT,
    "detected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "escalated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_reliability_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_reliability_timelines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "incident_id" UUID NOT NULL,
    "from_status" "trip_reliability_incident_status",
    "to_status" "trip_reliability_incident_status",
    "action" TEXT NOT NULL,
    "actor_user_id" UUID,
    "actor_role" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_reliability_timelines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_reliability_incidents_incident_number_key" ON "trip_reliability_incidents"("incident_number");

-- CreateIndex
CREATE UNIQUE INDEX "trip_reliability_incidents_fingerprint_key" ON "trip_reliability_incidents"("fingerprint");

-- CreateIndex
CREATE INDEX "trip_reliability_incidents_booking_id_status_idx" ON "trip_reliability_incidents"("booking_id", "status");

-- CreateIndex
CREATE INDEX "trip_reliability_incidents_customer_id_idx" ON "trip_reliability_incidents"("customer_id");

-- CreateIndex
CREATE INDEX "trip_reliability_incidents_driver_profile_id_idx" ON "trip_reliability_incidents"("driver_profile_id");

-- CreateIndex
CREATE INDEX "trip_reliability_incidents_type_status_idx" ON "trip_reliability_incidents"("type", "status");

-- CreateIndex
CREATE INDEX "trip_reliability_incidents_severity_status_idx" ON "trip_reliability_incidents"("severity", "status");

-- CreateIndex
CREATE INDEX "trip_reliability_incidents_created_at_idx" ON "trip_reliability_incidents"("created_at");

-- CreateIndex
CREATE INDEX "trip_reliability_timelines_incident_id_created_at_idx" ON "trip_reliability_timelines"("incident_id", "created_at");

-- AddForeignKey
ALTER TABLE "trip_reliability_incidents" ADD CONSTRAINT "trip_reliability_incidents_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_reliability_incidents" ADD CONSTRAINT "trip_reliability_incidents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_reliability_incidents" ADD CONSTRAINT "trip_reliability_incidents_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_reliability_timelines" ADD CONSTRAINT "trip_reliability_timelines_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "trip_reliability_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
