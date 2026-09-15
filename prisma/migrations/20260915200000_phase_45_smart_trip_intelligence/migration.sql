-- CreateTable
CREATE TABLE "trip_intelligence_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "actor_role" TEXT NOT NULL,
    "signal_type" TEXT NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'HIGH',
    "fingerprint" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_intelligence_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_intelligence_events_fingerprint_key" ON "trip_intelligence_events"("fingerprint");

-- CreateIndex
CREATE INDEX "trip_intelligence_events_booking_id_created_at_idx" ON "trip_intelligence_events"("booking_id", "created_at");

-- CreateIndex
CREATE INDEX "trip_intelligence_events_user_id_actor_role_idx" ON "trip_intelligence_events"("user_id", "actor_role");

-- CreateIndex
CREATE INDEX "trip_intelligence_events_signal_type_idx" ON "trip_intelligence_events"("signal_type");

-- AddForeignKey
ALTER TABLE "trip_intelligence_events" ADD CONSTRAINT "trip_intelligence_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_intelligence_events" ADD CONSTRAINT "trip_intelligence_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
