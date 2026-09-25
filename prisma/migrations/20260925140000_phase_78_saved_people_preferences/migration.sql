-- AlterTable
ALTER TABLE "customer_preferences" ADD COLUMN "preferred_vehicle_category" TEXT,
ADD COLUMN "preferred_service_type" TEXT,
ADD COLUMN "preferred_pickup_instructions" TEXT,
ADD COLUMN "preferred_driver_profile_id" UUID;

-- CreateTable
CREATE TABLE "customer_saved_people" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "relationship" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_saved_people_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_saved_people_customer_id_is_active_idx" ON "customer_saved_people"("customer_id", "is_active");
CREATE INDEX "customer_saved_people_customer_id_phone_idx" ON "customer_saved_people"("customer_id", "phone");

-- AddForeignKey
ALTER TABLE "customer_saved_people" ADD CONSTRAINT "customer_saved_people_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
