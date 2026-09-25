-- AlterTable
ALTER TABLE "booking_messages" ADD COLUMN "message_type" TEXT NOT NULL DEFAULT 'TEXT';
ALTER TABLE "booking_messages" ADD COLUMN "sender_role" TEXT;
ALTER TABLE "booking_messages" ADD COLUMN "read_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "booking_messages_booking_id_read_at_idx" ON "booking_messages"("booking_id", "read_at");
