-- CreateTable
CREATE TABLE "vehicle_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon_url" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicle_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_vehicle_capabilities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driver_profile_id" UUID NOT NULL,
    "vehicle_category_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_vehicle_capabilities_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "vehicle_category_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_categories_code_key" ON "vehicle_categories"("code");

-- CreateIndex
CREATE INDEX "vehicle_categories_is_active_display_order_idx" ON "vehicle_categories"("is_active", "display_order");

-- CreateIndex
CREATE INDEX "driver_vehicle_capabilities_vehicle_category_id_idx" ON "driver_vehicle_capabilities"("vehicle_category_id");

-- CreateIndex
CREATE INDEX "driver_vehicle_capabilities_driver_profile_id_idx" ON "driver_vehicle_capabilities"("driver_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_vehicle_capabilities_driver_profile_id_vehicle_category_id_key" ON "driver_vehicle_capabilities"("driver_profile_id", "vehicle_category_id");

-- AddForeignKey
ALTER TABLE "driver_vehicle_capabilities" ADD CONSTRAINT "driver_vehicle_capabilities_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_vehicle_capabilities" ADD CONSTRAINT "driver_vehicle_capabilities_vehicle_category_id_fkey" FOREIGN KEY ("vehicle_category_id") REFERENCES "vehicle_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_category_id_fkey" FOREIGN KEY ("vehicle_category_id") REFERENCES "vehicle_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
