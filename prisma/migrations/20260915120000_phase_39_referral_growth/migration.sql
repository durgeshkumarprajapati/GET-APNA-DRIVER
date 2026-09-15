-- CreateEnum
CREATE TYPE "referral_campaign_status" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "referral_audience" AS ENUM ('ALL', 'CUSTOMER', 'DRIVER');

-- CreateEnum
CREATE TYPE "referral_reward_type" AS ENUM ('MONETARY', 'LOYALTY_POINTS', 'PROMOTION_DISCOUNT');

-- CreateTable
CREATE TABLE "referral_campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "referral_campaign_status" NOT NULL DEFAULT 'DRAFT',
    "audience" "referral_audience" NOT NULL DEFAULT 'ALL',
    "reward_type" "referral_reward_type" NOT NULL DEFAULT 'MONETARY',
    "referrer_reward_value" DECIMAL(19,4) NOT NULL,
    "referee_reward_value" DECIMAL(19,4),
    "max_rewards_total" INTEGER,
    "max_rewards_per_user" INTEGER,
    "current_reward_count" INTEGER NOT NULL DEFAULT 0,
    "current_reward_spent" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "qualification_trigger" TEXT NOT NULL DEFAULT 'CUSTOMER_FIRST_TRIP',
    "qualification_min_trips" INTEGER NOT NULL DEFAULT 1,
    "qualification_min_amount" DECIMAL(19,4),
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "referral_campaigns_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "referrals" ADD COLUMN     "campaign_id" UUID,
ADD COLUMN     "channel" TEXT DEFAULT 'CODE',
ADD COLUMN     "referee_reward_amount" DECIMAL(19,4),
ADD COLUMN     "referee_rewarded_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE UNIQUE INDEX "referral_campaigns_code_key" ON "referral_campaigns"("code");

-- CreateIndex
CREATE INDEX "referral_campaigns_status_idx" ON "referral_campaigns"("status");

-- CreateIndex
CREATE INDEX "referral_campaigns_audience_idx" ON "referral_campaigns"("audience");

-- CreateIndex
CREATE INDEX "referral_campaigns_starts_at_ends_at_idx" ON "referral_campaigns"("starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "referrals_campaign_id_idx" ON "referrals"("campaign_id");

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "referral_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
