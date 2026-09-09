-- CreateEnum
CREATE TYPE "safety_incident_type" AS ENUM ('SOS_EMERGENCY', 'ACCIDENT', 'MEDICAL_EMERGENCY', 'THREAT', 'HARASSMENT', 'VEHICLE_BREAKDOWN', 'UNSAFE_BEHAVIOR', 'OTHER');

-- CreateEnum
CREATE TYPE "safety_incident_severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "safety_incident_status" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "dispute_category" AS ENUM ('PAYMENT_ISSUE', 'FARE_DISPUTE', 'DRIVER_CONDUCT', 'CUSTOMER_CONDUCT', 'TRIP_ROUTE', 'CANCELLATION', 'DAMAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "dispute_status" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "notification_type" ADD VALUE 'SAFETY_SOS_TRIGGERED';
ALTER TYPE "notification_type" ADD VALUE 'SAFETY_INCIDENT_UPDATED';
ALTER TYPE "notification_type" ADD VALUE 'DISPUTE_CREATED';
ALTER TYPE "notification_type" ADD VALUE 'DISPUTE_UPDATED';
ALTER TYPE "notification_type" ADD VALUE 'DISPUTE_RESOLVED';

-- CreateTable
CREATE TABLE "safety_incidents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "incident_number" TEXT NOT NULL,
    "type" "safety_incident_type" NOT NULL DEFAULT 'SOS_EMERGENCY',
    "severity" "safety_incident_severity" NOT NULL DEFAULT 'CRITICAL',
    "status" "safety_incident_status" NOT NULL DEFAULT 'OPEN',
    "booking_id" UUID,
    "reporter_user_id" UUID NOT NULL,
    "customer_id" UUID,
    "driver_profile_id" UUID,
    "assigned_operator_id" UUID,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "location_accuracy" DOUBLE PRECISION,
    "snapshot_address" TEXT,
    "description" TEXT,
    "resolution_summary" TEXT,
    "idempotency_key" TEXT,
    "acknowledged_at" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "safety_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_incident_timelines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "incident_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "from_status" "safety_incident_status",
    "to_status" "safety_incident_status",
    "performed_by" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_incident_timelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dispute_number" TEXT NOT NULL,
    "booking_id" UUID NOT NULL,
    "raised_by_user_id" UUID NOT NULL,
    "assigned_operator_id" UUID,
    "category" "dispute_category" NOT NULL DEFAULT 'PAYMENT_ISSUE',
    "status" "dispute_status" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "evidence_urls" JSONB,
    "resolution_summary" TEXT,
    "refund_amount_minor_units" INTEGER,
    "financial_adjustment_summary" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dispute_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "from_status" "dispute_status",
    "to_status" "dispute_status",
    "performed_by" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "safety_incidents_incident_number_key" ON "safety_incidents"("incident_number");

-- CreateIndex
CREATE UNIQUE INDEX "safety_incidents_idempotency_key_key" ON "safety_incidents"("idempotency_key");

-- CreateIndex
CREATE INDEX "safety_incidents_status_severity_created_at_idx" ON "safety_incidents"("status", "severity", "created_at");

-- CreateIndex
CREATE INDEX "safety_incidents_booking_id_idx" ON "safety_incidents"("booking_id");

-- CreateIndex
CREATE INDEX "safety_incidents_reporter_user_id_idx" ON "safety_incidents"("reporter_user_id");

-- CreateIndex
CREATE INDEX "safety_incidents_customer_id_idx" ON "safety_incidents"("customer_id");

-- CreateIndex
CREATE INDEX "safety_incidents_driver_profile_id_idx" ON "safety_incidents"("driver_profile_id");

-- CreateIndex
CREATE INDEX "safety_incident_timelines_incident_id_created_at_idx" ON "safety_incident_timelines"("incident_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "disputes_dispute_number_key" ON "disputes"("dispute_number");

-- CreateIndex
CREATE INDEX "disputes_status_category_created_at_idx" ON "disputes"("status", "category", "created_at");

-- CreateIndex
CREATE INDEX "disputes_booking_id_idx" ON "disputes"("booking_id");

-- CreateIndex
CREATE INDEX "disputes_raised_by_user_id_idx" ON "disputes"("raised_by_user_id");

-- CreateIndex
CREATE INDEX "dispute_logs_dispute_id_created_at_idx" ON "dispute_logs"("dispute_id", "created_at");

-- AddForeignKey
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_assigned_operator_id_fkey" FOREIGN KEY ("assigned_operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_incident_timelines" ADD CONSTRAINT "safety_incident_timelines_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "safety_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_incident_timelines" ADD CONSTRAINT "safety_incident_timelines_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_raised_by_user_id_fkey" FOREIGN KEY ("raised_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_assigned_operator_id_fkey" FOREIGN KEY ("assigned_operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_logs" ADD CONSTRAINT "dispute_logs_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_logs" ADD CONSTRAINT "dispute_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
