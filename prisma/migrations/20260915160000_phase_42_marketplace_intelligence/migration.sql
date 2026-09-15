-- CreateEnum
CREATE TYPE "MarketplaceZoneStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RecommendationActionType" AS ENUM ('ACKNOWLEDGED', 'DISMISSED');

-- CreateTable
CREATE TABLE "marketplace_zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "center_latitude" DOUBLE PRECISION NOT NULL,
    "center_longitude" DOUBLE PRECISION NOT NULL,
    "radius_meters" INTEGER NOT NULL DEFAULT 5000,
    "status" "MarketplaceZoneStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_recommendation_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recommendation_fingerprint" TEXT NOT NULL,
    "action" "RecommendationActionType" NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_recommendation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_zones_code_key" ON "marketplace_zones"("code");

-- CreateIndex
CREATE INDEX "marketplace_zones_status_idx" ON "marketplace_zones"("status");

-- CreateIndex
CREATE INDEX "marketplace_recommendation_actions_recommendation_fingerpr_idx" ON "marketplace_recommendation_actions"("recommendation_fingerprint", "action");

-- CreateIndex
CREATE INDEX "marketplace_recommendation_actions_admin_user_id_idx" ON "marketplace_recommendation_actions"("admin_user_id");

-- AddForeignKey
ALTER TABLE "marketplace_recommendation_actions" ADD CONSTRAINT "marketplace_recommendation_actions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
