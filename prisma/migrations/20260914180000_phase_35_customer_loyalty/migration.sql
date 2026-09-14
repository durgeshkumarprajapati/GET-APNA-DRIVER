-- CreateEnum
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('RIDE_EARNED', 'TIER_BONUS', 'STREAK_BONUS', 'REFERRAL_BONUS', 'PROMOTIONAL_BONUS', 'REWARD_REDEMPTION', 'EXPIRATION', 'REVERSAL', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LoyaltyTierCode" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "LoyaltyRewardType" AS ENUM ('PROMOTION', 'DISCOUNT', 'FREE_RIDE', 'PRIORITY_BOOKING', 'POINT_MULTIPLIER');

-- CreateEnum
CREATE TYPE "LoyaltyRewardStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LoyaltyRedemptionStatus" AS ENUM ('COMPLETED', 'REVERSED', 'EXPIRED');

-- CreateTable
CREATE TABLE "customer_loyalty_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "current_points" INTEGER NOT NULL DEFAULT 0,
    "lifetime_earned_points" INTEGER NOT NULL DEFAULT 0,
    "lifetime_redeemed_points" INTEGER NOT NULL DEFAULT 0,
    "current_tier_id" UUID,
    "tier_upgraded_at" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_loyalty_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_tiers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" "LoyaltyTierCode" NOT NULL,
    "name" TEXT NOT NULL,
    "minimum_lifetime_points" INTEGER NOT NULL DEFAULT 0,
    "minimum_completed_trips" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "point_multiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "benefits" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "loyalty_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_point_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loyalty_account_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "type" "LoyaltyTransactionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "booking_id" UUID,
    "reward_id" UUID,
    "reference_id" TEXT,
    "idempotency_key" TEXT,
    "admin_user_id" UUID,
    "description" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_point_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_rewards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reward_type" "LoyaltyRewardType" NOT NULL,
    "points_required" INTEGER NOT NULL,
    "minimum_tier_id" UUID,
    "promotion_id" UUID,
    "discount_value" DECIMAL(12,4),
    "status" "LoyaltyRewardStatus" NOT NULL DEFAULT 'ACTIVE',
    "starts_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "total_redemption_limit" INTEGER,
    "total_redeemed_count" INTEGER NOT NULL DEFAULT 0,
    "per_customer_limit" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "loyalty_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_reward_redemptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loyalty_account_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "reward_id" UUID NOT NULL,
    "points_deducted" INTEGER NOT NULL,
    "status" "LoyaltyRedemptionStatus" NOT NULL DEFAULT 'COMPLETED',
    "idempotency_key" TEXT,
    "promotion_usage_id" UUID,
    "redeemed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_reward_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_loyalty_accounts_customer_id_key" ON "customer_loyalty_accounts"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_tiers_code_key" ON "loyalty_tiers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_point_transactions_idempotency_key_key" ON "loyalty_point_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "loyalty_point_transactions_customer_id_created_at_idx" ON "loyalty_point_transactions"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "loyalty_point_transactions_customer_id_type_idx" ON "loyalty_point_transactions"("customer_id", "type");

-- CreateIndex
CREATE INDEX "loyalty_point_transactions_customer_id_expires_at_idx" ON "loyalty_point_transactions"("customer_id", "expires_at");

-- CreateIndex
CREATE INDEX "loyalty_point_transactions_booking_id_idx" ON "loyalty_point_transactions"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_reward_redemptions_idempotency_key_key" ON "loyalty_reward_redemptions"("idempotency_key");

-- CreateIndex
CREATE INDEX "loyalty_reward_redemptions_customer_id_redeemed_at_idx" ON "loyalty_reward_redemptions"("customer_id", "redeemed_at");

-- CreateIndex
CREATE INDEX "loyalty_reward_redemptions_reward_id_customer_id_idx" ON "loyalty_reward_redemptions"("reward_id", "customer_id");

-- AddForeignKey
ALTER TABLE "customer_loyalty_accounts" ADD CONSTRAINT "customer_loyalty_accounts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_loyalty_accounts" ADD CONSTRAINT "customer_loyalty_accounts_current_tier_id_fkey" FOREIGN KEY ("current_tier_id") REFERENCES "loyalty_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_point_transactions" ADD CONSTRAINT "loyalty_point_transactions_loyalty_account_id_fkey" FOREIGN KEY ("loyalty_account_id") REFERENCES "customer_loyalty_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_point_transactions" ADD CONSTRAINT "loyalty_point_transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_point_transactions" ADD CONSTRAINT "loyalty_point_transactions_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "loyalty_rewards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_point_transactions" ADD CONSTRAINT "loyalty_point_transactions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_rewards" ADD CONSTRAINT "loyalty_rewards_minimum_tier_id_fkey" FOREIGN KEY ("minimum_tier_id") REFERENCES "loyalty_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_rewards" ADD CONSTRAINT "loyalty_rewards_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_reward_redemptions" ADD CONSTRAINT "loyalty_reward_redemptions_loyalty_account_id_fkey" FOREIGN KEY ("loyalty_account_id") REFERENCES "customer_loyalty_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_reward_redemptions" ADD CONSTRAINT "loyalty_reward_redemptions_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "loyalty_rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
