-- Phase: Driver coupons. Admin-managed codes that credit a flat amount
-- directly to DriverWallet.availableBalance on redemption. Deliberately a
-- separate model from Promotion rather than extending it: Promotion /
-- PromotionUsage discount a customer's booking fare and are structurally
-- tied to a Booking; a driver coupon has no booking/fare concept at all —
-- see the schema doc comment above DriverCoupon.

-- AlterEnum
ALTER TYPE "wallet_change_type" ADD VALUE 'COUPON_REDEEMED';

-- AlterEnum
ALTER TYPE "financial_transaction_type" ADD VALUE 'DRIVER_COUPON_REDEEMED';

-- CreateEnum
CREATE TYPE "driver_coupon_status" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "driver_coupons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "credit_amount" DECIMAL(12,4) NOT NULL,
    "status" "driver_coupon_status" NOT NULL DEFAULT 'DRAFT',
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6),
    "total_usage_limit" INTEGER,
    "total_usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_coupon_redemptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driver_coupon_id" UUID NOT NULL,
    "driver_profile_id" UUID NOT NULL,
    "credit_amount_snapshot" DECIMAL(12,4) NOT NULL,
    "financial_transaction_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "driver_coupons_code_key" ON "driver_coupons"("code");

-- CreateIndex
CREATE INDEX "driver_coupons_status_idx" ON "driver_coupons"("status");

-- CreateIndex
CREATE INDEX "driver_coupons_starts_at_ends_at_idx" ON "driver_coupons"("starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "driver_coupon_redemptions_coupon_driver_key" ON "driver_coupon_redemptions"("driver_coupon_id", "driver_profile_id");

-- CreateIndex
CREATE INDEX "driver_coupon_redemptions_driver_coupon_id_idx" ON "driver_coupon_redemptions"("driver_coupon_id");

-- AddForeignKey
ALTER TABLE "driver_coupon_redemptions" ADD CONSTRAINT "driver_coupon_redemptions_driver_coupon_id_fkey" FOREIGN KEY ("driver_coupon_id") REFERENCES "driver_coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_coupon_redemptions" ADD CONSTRAINT "driver_coupon_redemptions_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
