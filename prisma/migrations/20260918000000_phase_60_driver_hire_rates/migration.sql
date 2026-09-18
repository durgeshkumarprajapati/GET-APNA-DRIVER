-- Driver-set hire rates for DAILY/WEEKLY/MONTHLY bookings, and the frozen
-- per-booking snapshot of whichever rate a customer's booking locked in.
ALTER TABLE "driver_profiles" ADD COLUMN "daily_hire_rate" DECIMAL(12,4);
ALTER TABLE "driver_profiles" ADD COLUMN "weekly_hire_rate" DECIMAL(12,4);
ALTER TABLE "driver_profiles" ADD COLUMN "monthly_hire_rate" DECIMAL(12,4);

ALTER TABLE "bookings" ADD COLUMN "driver_custom_rate_snapshot" DECIMAL(12,4);
