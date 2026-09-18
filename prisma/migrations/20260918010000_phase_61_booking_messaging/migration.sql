-- Direct customer <-> driver text messaging per booking, plus the
-- notification type fired when a new message arrives.
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'BOOKING_MESSAGE_RECEIVED';

CREATE TABLE "booking_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "sender_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "booking_messages_booking_id_created_at_idx" ON "booking_messages"("booking_id", "created_at");

ALTER TABLE "booking_messages" ADD CONSTRAINT "booking_messages_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking_messages" ADD CONSTRAINT "booking_messages_sender_user_id_fkey"
    FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
