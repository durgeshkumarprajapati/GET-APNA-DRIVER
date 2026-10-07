-- Phase 89 (personalization opt-out) and Phase 90 (notification quiet hours
-- & frequency cap) both added fields to UpdateCustomerPreferenceInput and to
-- the read side (notification-intelligence-service.ts,
-- experience-orchestration-service.ts) without ever adding the backing
-- columns or writing them in updateCustomerPreference — every toggle was a
-- silent no-op. This adds the real columns.

-- AlterTable
ALTER TABLE "customer_preferences"
  ADD COLUMN "personalization_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "favorite_driver_suggestions_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "promotion_suggestions_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "personalized_shortcuts_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "quiet_hours_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "quiet_hours_start" TEXT NOT NULL DEFAULT '22:00',
  ADD COLUMN "quiet_hours_end" TEXT NOT NULL DEFAULT '07:00',
  ADD COLUMN "notification_timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  ADD COLUMN "frequency_cap_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "max_non_urgent_per_day" INTEGER NOT NULL DEFAULT 3;
