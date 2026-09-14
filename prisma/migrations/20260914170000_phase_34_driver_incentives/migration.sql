-- AlterEnum
ALTER TYPE "financial_transaction_type" ADD VALUE 'INCENTIVE_REWARD';

-- AlterEnum
ALTER TYPE "wallet_change_type" ADD VALUE 'INCENTIVE_REWARD';

-- CreateEnum
CREATE TYPE "incentive_campaign_status" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "incentive_type" AS ENUM ('TRIP_COUNT', 'EARNINGS_THRESHOLD', 'TIME_WINDOW');

-- CreateEnum
CREATE TYPE "incentive_progress_status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'QUALIFIED', 'REWARDED');

-- CreateTable
CREATE TABLE "driver_incentive_campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "incentive_campaign_status" NOT NULL DEFAULT 'DRAFT',
    "incentive_type" "incentive_type" NOT NULL,
    "target_value" DECIMAL(12,4) NOT NULL,
    "reward_amount" DECIMAL(12,4) NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "configuration" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_incentive_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_incentive_progresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id" UUID NOT NULL,
    "driver_profile_id" UUID NOT NULL,
    "status" "incentive_progress_status" NOT NULL DEFAULT 'IN_PROGRESS',
    "current_value" DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    "target_value" DECIMAL(12,4) NOT NULL,
    "reward_amount" DECIMAL(12,4) NOT NULL,
    "qualified_at" TIMESTAMPTZ(6),
    "rewarded_at" TIMESTAMPTZ(6),
    "financial_transaction_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_incentive_progresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_goal_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driver_profile_id" UUID NOT NULL,
    "daily_trip_goal" INTEGER NOT NULL DEFAULT 5,
    "weekly_earnings_goal" DECIMAL(12,4) NOT NULL DEFAULT 15000.0000,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_goal_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "driver_incentive_campaigns_status_start_at_end_at_idx" ON "driver_incentive_campaigns"("status", "start_at", "end_at");

-- CreateIndex
CREATE UNIQUE INDEX "driver_incentive_progresses_financial_transaction_id_key" ON "driver_incentive_progresses"("financial_transaction_id");

-- CreateIndex
CREATE INDEX "driver_incentive_progresses_driver_profile_id_status_idx" ON "driver_incentive_progresses"("driver_profile_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "driver_incentive_progresses_campaign_id_driver_profile_id_key" ON "driver_incentive_progresses"("campaign_id", "driver_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_goal_preferences_driver_profile_id_key" ON "driver_goal_preferences"("driver_profile_id");

-- AddForeignKey
ALTER TABLE "driver_incentive_progresses" ADD CONSTRAINT "driver_incentive_progresses_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "driver_incentive_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_incentive_progresses" ADD CONSTRAINT "driver_incentive_progresses_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_incentive_progresses" ADD CONSTRAINT "driver_incentive_progresses_financial_transaction_id_fkey" FOREIGN KEY ("financial_transaction_id") REFERENCES "financial_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_goal_preferences" ADD CONSTRAINT "driver_goal_preferences_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
