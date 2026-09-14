-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "preferred_driver_profile_id" UUID;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_preferred_driver_profile_id_fkey" FOREIGN KEY ("preferred_driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
