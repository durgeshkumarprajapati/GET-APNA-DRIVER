-- CreateTable
CREATE TABLE "booking_service_recipients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "relationship" TEXT,
    "notes" TEXT,
    "notify_via_whatsapp" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_service_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "booking_service_recipients_booking_id_key" ON "booking_service_recipients"("booking_id");

-- CreateIndex
CREATE INDEX "booking_service_recipients_phone_idx" ON "booking_service_recipients"("phone");

-- AddForeignKey
ALTER TABLE "booking_service_recipients" ADD CONSTRAINT "booking_service_recipients_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
