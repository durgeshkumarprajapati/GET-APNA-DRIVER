-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "dropoff_latitude" DOUBLE PRECISION,
ADD COLUMN     "dropoff_longitude" DOUBLE PRECISION,
ADD COLUMN     "dropoff_address" TEXT,
ADD COLUMN     "dropoff_label" TEXT,
ADD COLUMN     "number_of_days" INTEGER,
ADD COLUMN     "hourly_package_hours" INTEGER,
ADD COLUMN     "return_date" TIMESTAMPTZ(6),
ADD COLUMN     "estimated_distance_km" DOUBLE PRECISION,
ADD COLUMN     "estimated_fare_amount" DECIMAL(12,4),
ADD COLUMN     "final_fare_amount" DECIMAL(12,4),
ADD COLUMN     "pricing_snapshot" JSONB,
ADD COLUMN     "route_estimate_snapshot" JSONB;
