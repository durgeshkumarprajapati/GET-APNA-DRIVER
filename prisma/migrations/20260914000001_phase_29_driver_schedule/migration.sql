-- CreateEnum
CREATE TYPE "day_of_week" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "schedule_exception_type" AS ENUM ('OFF', 'CUSTOM_HOURS', 'HOLIDAY', 'LEAVE');

-- CreateTable
CREATE TABLE "driver_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driver_profile_id" UUID NOT NULL,
    "day_of_week" "day_of_week" NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_overnight" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_schedule_exceptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driver_profile_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "exception_type" "schedule_exception_type" NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "driver_schedules_driver_profile_id_day_of_week_key" ON "driver_schedules"("driver_profile_id", "day_of_week");

-- CreateIndex
CREATE INDEX "driver_schedules_driver_profile_id_is_active_idx" ON "driver_schedules"("driver_profile_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "driver_schedule_exceptions_driver_profile_id_date_key" ON "driver_schedule_exceptions"("driver_profile_id", "date");

-- CreateIndex
CREATE INDEX "driver_schedule_exceptions_driver_profile_id_date_idx" ON "driver_schedule_exceptions"("driver_profile_id", "date");

-- AddForeignKey
ALTER TABLE "driver_schedules" ADD CONSTRAINT "driver_schedules_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_schedule_exceptions" ADD CONSTRAINT "driver_schedule_exceptions_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
