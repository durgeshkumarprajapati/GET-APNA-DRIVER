-- CreateEnum
CREATE TYPE "promotion_discount_type" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "promotion_status" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "discount_amount" DECIMAL(12,4),
ADD COLUMN     "discount_type" "promotion_discount_type",
ADD COLUMN     "promotion_code_snapshot" TEXT,
ADD COLUMN     "promotion_id" UUID;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "discount_amount" DECIMAL(19,4),
ADD COLUMN     "promotion_code_snapshot" TEXT,
ADD COLUMN     "promotion_id" UUID;

-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discount_type" "promotion_discount_type" NOT NULL,
    "discount_value" DECIMAL(12,4) NOT NULL,
    "max_discount_amount" DECIMAL(12,4),
    "min_booking_value" DECIMAL(12,4),
    "first_ride_only" BOOLEAN NOT NULL DEFAULT false,
    "is_automatic" BOOLEAN NOT NULL DEFAULT false,
    "status" "promotion_status" NOT NULL DEFAULT 'DRAFT',
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6),
    "total_usage_limit" INTEGER,
    "total_usage_count" INTEGER NOT NULL DEFAULT 0,
    "per_user_usage_limit" INTEGER DEFAULT 1,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_usages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "promotion_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "discount_amount" DECIMAL(12,4) NOT NULL,
    "promotion_code_snapshot" TEXT,
    "discount_type_snapshot" "promotion_discount_type" NOT NULL,
    "discount_value_snapshot" DECIMAL(12,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");

-- CreateIndex
CREATE INDEX "promotions_status_idx" ON "promotions"("status");

-- CreateIndex
CREATE INDEX "promotions_starts_at_ends_at_idx" ON "promotions"("starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_usages_booking_id_key" ON "promotion_usages"("booking_id");

-- CreateIndex
CREATE INDEX "promotion_usages_promotion_id_user_id_idx" ON "promotion_usages"("promotion_id", "user_id");

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

