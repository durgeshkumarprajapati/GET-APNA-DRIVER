-- CreateEnum
CREATE TYPE "platform_health_status" AS ENUM ('HEALTHY', 'DEGRADED', 'WARNING', 'CRITICAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "alert_severity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "alert_status" AS ENUM ('OK', 'FIRING', 'RECOVERED');

-- CreateTable
CREATE TABLE "platform_health_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "overall_score" INTEGER NOT NULL,
    "overall_status" "platform_health_status" NOT NULL,
    "application_status" "platform_health_status" NOT NULL,
    "database_status" "platform_health_status" NOT NULL,
    "redis_status" "platform_health_status" NOT NULL,
    "worker_status" "platform_health_status" NOT NULL,
    "booking_status" "platform_health_status" NOT NULL,
    "dispatch_status" "platform_health_status" NOT NULL,
    "payment_status" "platform_health_status" NOT NULL,
    "notification_status" "platform_health_status" NOT NULL,
    "location_status" "platform_health_status" NOT NULL,
    "scheduled_ride_status" "platform_health_status" NOT NULL,
    "reliability_status" "platform_health_status" NOT NULL,
    "dependency_status" "platform_health_status" NOT NULL,
    "evidence" JSONB NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_health_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_metric_buckets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bucket_start" TIMESTAMPTZ(6) NOT NULL,
    "metric_name" TEXT NOT NULL,
    "dimension" TEXT NOT NULL DEFAULT 'GLOBAL',
    "count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "total_duration_ms" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "min_duration_ms" DOUBLE PRECISION,
    "max_duration_ms" DOUBLE PRECISION,
    "p50_duration_ms" DOUBLE PRECISION,
    "p95_duration_ms" DOUBLE PRECISION,
    "p99_duration_ms" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operational_metric_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fingerprint" TEXT NOT NULL,
    "rule_name" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "status" "alert_status" NOT NULL DEFAULT 'OK',
    "severity" "alert_severity" NOT NULL DEFAULT 'WARNING',
    "current_value" DOUBLE PRECISION NOT NULL,
    "threshold_value" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "firing_at" TIMESTAMPTZ(6),
    "recovered_at" TIMESTAMPTZ(6),
    "last_evaluated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "platform_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_health_snapshots_overall_status_created_at_idx" ON "platform_health_snapshots"("overall_status", "created_at");

-- CreateIndex
CREATE INDEX "platform_health_snapshots_created_at_idx" ON "platform_health_snapshots"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "operational_metric_buckets_bucket_start_metric_name_dimensio_key" ON "operational_metric_buckets"("bucket_start", "metric_name", "dimension");

-- CreateIndex
CREATE INDEX "operational_metric_buckets_metric_name_bucket_start_idx" ON "operational_metric_buckets"("metric_name", "bucket_start");

-- CreateIndex
CREATE INDEX "operational_metric_buckets_bucket_start_idx" ON "operational_metric_buckets"("bucket_start");

-- CreateIndex
CREATE UNIQUE INDEX "platform_alerts_fingerprint_key" ON "platform_alerts"("fingerprint");

-- CreateIndex
CREATE INDEX "platform_alerts_status_severity_idx" ON "platform_alerts"("status", "severity");

-- CreateIndex
CREATE INDEX "platform_alerts_component_status_idx" ON "platform_alerts"("component", "status");
