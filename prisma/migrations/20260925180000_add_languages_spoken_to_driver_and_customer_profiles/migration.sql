-- AlterTable
ALTER TABLE "driver_profiles" ADD COLUMN IF NOT EXISTS "languages_spoken" TEXT[] DEFAULT ARRAY['en', 'hi']::TEXT[];

-- AlterTable
ALTER TABLE "customer_preferences" ADD COLUMN IF NOT EXISTS "languages_spoken" TEXT[] DEFAULT ARRAY['en', 'hi']::TEXT[];
