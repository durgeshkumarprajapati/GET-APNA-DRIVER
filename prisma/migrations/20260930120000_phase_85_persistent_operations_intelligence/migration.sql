-- CreateEnum
CREATE TYPE "operations_decision_type" AS ENUM ('DISPATCH_PRESSURE', 'DRIVER_SHORTAGE', 'BOOKING_BACKLOG', 'TRIP_RELIABILITY_PRESSURE', 'SAFETY_PRESSURE', 'SUPPORT_BACKLOG', 'SCHEDULED_RIDE_RISK', 'PLATFORM_DEGRADATION', 'DEPENDENCY_DEGRADATION', 'LOCATION_TELEMETRY_DEGRADATION', 'CAPACITY_FORECAST_RISK');

-- CreateEnum
CREATE TYPE "operations_severity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "operations_confidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "operations_decision_status" AS ENUM ('DETECTED', 'ACKNOWLEDGED', 'ACTION_PENDING', 'ACTION_IN_PROGRESS', 'RESOLVED', 'DISMISSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "operations_execution_status" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "operations_decisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fingerprint" TEXT NOT NULL,
    "decision_type" "operations_decision_type" NOT NULL,
    "severity" "operations_severity" NOT NULL,
    "confidence" "operations_confidence" NOT NULL,
    "status" "operations_decision_status" NOT NULL DEFAULT 'DETECTED',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "why" TEXT NOT NULL,
    "zone_id" TEXT,
    "booking_id" UUID,
    "incident_id" UUID,
    "evidence" JSONB NOT NULL,
    "recommended_actions" JSONB NOT NULL,
    "expected_impact" TEXT NOT NULL,
    "metadata" JSONB,
    "acknowledged_by" UUID,
    "acknowledged_at" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "dismissed_by" UUID,
    "dismissed_at" TIMESTAMPTZ(6),
    "dismissal_reason" TEXT,
    "escalated_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "detected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations_decision_executions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "decision_id" UUID NOT NULL,
    "action_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "status" "operations_execution_status" NOT NULL DEFAULT 'PENDING',
    "attempt_number" INTEGER NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "reason" TEXT,
    "result_message" TEXT,
    "failure_code" TEXT,
    "failure_summary" TEXT,
    "details" JSONB,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operations_decision_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operations_decisions_fingerprint_key" ON "operations_decisions"("fingerprint");

-- CreateIndex
CREATE INDEX "operations_decisions_status_severity_idx" ON "operations_decisions"("status", "severity");

-- CreateIndex
CREATE INDEX "operations_decisions_decision_type_status_idx" ON "operations_decisions"("decision_type", "status");

-- CreateIndex
CREATE INDEX "operations_decisions_zone_id_idx" ON "operations_decisions"("zone_id");

-- CreateIndex
CREATE INDEX "operations_decisions_booking_id_idx" ON "operations_decisions"("booking_id");

-- CreateIndex
CREATE INDEX "operations_decisions_incident_id_idx" ON "operations_decisions"("incident_id");

-- CreateIndex
CREATE INDEX "operations_decisions_created_at_idx" ON "operations_decisions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "operations_decision_executions_idempotency_key_key" ON "operations_decision_executions"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "operations_decision_executions_decision_id_attempt_number_key" ON "operations_decision_executions"("decision_id", "attempt_number");

-- CreateIndex
CREATE INDEX "operations_decision_executions_decision_id_status_idx" ON "operations_decision_executions"("decision_id", "status");

-- CreateIndex
CREATE INDEX "operations_decision_executions_status_started_at_idx" ON "operations_decision_executions"("status", "started_at");

-- AddForeignKey
ALTER TABLE "operations_decision_executions" ADD CONSTRAINT "operations_decision_executions_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "operations_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
