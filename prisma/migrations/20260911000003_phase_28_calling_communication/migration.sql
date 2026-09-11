-- CreateEnum
CREATE TYPE "call_type" AS ENUM ('CUSTOMER_TO_DRIVER', 'DRIVER_TO_CUSTOMER', 'CUSTOMER_TO_SUPPORT', 'DRIVER_TO_SUPPORT');

-- CreateEnum
CREATE TYPE "call_status" AS ENUM ('REQUESTED', 'INITIATED', 'RINGING', 'ANSWERED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "call_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL DEFAULT 'MOCK',
    "provider_call_id" TEXT,
    "call_type" "call_type" NOT NULL,
    "status" "call_status" NOT NULL DEFAULT 'REQUESTED',
    "initiated_by_user_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "driver_profile_id" UUID,
    "booking_id" UUID,
    "support_ticket_id" UUID,
    "caller_phone_masked" TEXT,
    "recipient_phone_masked" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answered_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "duration_seconds" INTEGER,
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "call_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "call_sessions_provider_call_id_key" ON "call_sessions"("provider_call_id");

-- CreateIndex
CREATE INDEX "call_sessions_customer_id_created_at_idx" ON "call_sessions"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "call_sessions_driver_profile_id_created_at_idx" ON "call_sessions"("driver_profile_id", "created_at");

-- CreateIndex
CREATE INDEX "call_sessions_booking_id_idx" ON "call_sessions"("booking_id");

-- CreateIndex
CREATE INDEX "call_sessions_provider_call_id_idx" ON "call_sessions"("provider_call_id");

-- CreateIndex
CREATE INDEX "call_sessions_status_created_at_idx" ON "call_sessions"("status", "created_at");

-- AddForeignKey
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_initiated_by_user_id_fkey" FOREIGN KEY ("initiated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_support_ticket_id_fkey" FOREIGN KEY ("support_ticket_id") REFERENCES "support_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
