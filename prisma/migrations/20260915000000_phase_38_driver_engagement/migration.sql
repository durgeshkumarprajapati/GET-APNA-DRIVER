-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('TRIPS', 'STREAK', 'RATING', 'EARNINGS', 'SCHEDULE', 'COMPLIANCE', 'GOAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "StreakStatus" AS ENUM ('ACTIVE', 'BROKEN', 'PROTECTED');

-- CreateTable
CREATE TABLE "driver_achievement_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "AchievementCategory" NOT NULL DEFAULT 'TRIPS',
    "target_value" DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
    "badge_icon" TEXT NOT NULL DEFAULT 'emoji_events',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "criteria_config" JSONB,
    "reward_config" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_achievement_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_achievement_progresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driver_profile_id" UUID NOT NULL,
    "achievement_definition_id" UUID NOT NULL,
    "current_value" DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    "target_value" DECIMAL(12,4) NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ(6),
    "last_evaluated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_achievement_progresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_achievement_unlocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driver_profile_id" UUID NOT NULL,
    "achievement_definition_id" UUID NOT NULL,
    "unlocked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotency_key" TEXT,
    "trigger_reference_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_achievement_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_streaks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driver_profile_id" UUID NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "last_qualifying_date" DATE,
    "streak_status" "StreakStatus" NOT NULL DEFAULT 'ACTIVE',
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "driver_achievement_definitions_code_key" ON "driver_achievement_definitions"("code");

-- CreateIndex
CREATE INDEX "driver_achievement_definitions_is_active_category_display_order_idx" ON "driver_achievement_definitions"("is_active", "category", "display_order");

-- CreateIndex
CREATE INDEX "driver_achievement_progresses_driver_profile_id_is_completed_idx" ON "driver_achievement_progresses"("driver_profile_id", "is_completed");

-- CreateIndex
CREATE UNIQUE INDEX "driver_achievement_progresses_driver_profile_id_achievement_definition_id_key" ON "driver_achievement_progresses"("driver_profile_id", "achievement_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_achievement_unlocks_idempotency_key_key" ON "driver_achievement_unlocks"("idempotency_key");

-- CreateIndex
CREATE INDEX "driver_achievement_unlocks_driver_profile_id_unlocked_at_idx" ON "driver_achievement_unlocks"("driver_profile_id", "unlocked_at");

-- CreateIndex
CREATE UNIQUE INDEX "driver_achievement_unlocks_driver_profile_id_achievement_definition_id_key" ON "driver_achievement_unlocks"("driver_profile_id", "achievement_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_streaks_driver_profile_id_key" ON "driver_streaks"("driver_profile_id");

-- AddForeignKey
ALTER TABLE "driver_achievement_progresses" ADD CONSTRAINT "driver_achievement_progresses_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_achievement_progresses" ADD CONSTRAINT "driver_achievement_progresses_achievement_definition_id_fkey" FOREIGN KEY ("achievement_definition_id") REFERENCES "driver_achievement_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_achievement_unlocks" ADD CONSTRAINT "driver_achievement_unlocks_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_achievement_unlocks" ADD CONSTRAINT "driver_achievement_unlocks_achievement_definition_id_fkey" FOREIGN KEY ("achievement_definition_id") REFERENCES "driver_achievement_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_streaks" ADD CONSTRAINT "driver_streaks_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
