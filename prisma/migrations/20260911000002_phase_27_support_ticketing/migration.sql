-- CreateEnum
CREATE TYPE "support_ticket_category" AS ENUM ('BOOKING_ISSUE', 'DRIVER_CONDUCT', 'PAYMENT_FARE', 'REFUND_REQUEST', 'PROMOTION_CODE', 'ACCOUNT_PROFILE', 'APP_TECHNICAL', 'SAFETY_CONCERN', 'OTHER');

-- CreateEnum
CREATE TYPE "support_ticket_status" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED', 'REOPENED');

-- CreateEnum
CREATE TYPE "support_ticket_priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "support_ticket_author_role" AS ENUM ('CUSTOMER', 'SUPPORT_AGENT', 'SYSTEM');

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "booking_id" UUID,
    "category" "support_ticket_category" NOT NULL,
    "status" "support_ticket_status" NOT NULL DEFAULT 'OPEN',
    "priority" "support_ticket_priority" NOT NULL DEFAULT 'NORMAL',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assigned_admin_id" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "author_role" "support_ticket_author_role" NOT NULL,
    "is_internal_note" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticket_number_key" ON "support_tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "support_tickets_customer_id_status_created_at_idx" ON "support_tickets"("customer_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "support_tickets_status_priority_created_at_idx" ON "support_tickets"("status", "priority", "created_at");

-- CreateIndex
CREATE INDEX "support_tickets_booking_id_idx" ON "support_tickets"("booking_id");

-- CreateIndex
CREATE INDEX "support_tickets_assigned_admin_id_idx" ON "support_tickets"("assigned_admin_id");

-- CreateIndex
CREATE INDEX "support_messages_ticket_id_is_internal_note_created_at_idx" ON "support_messages"("ticket_id", "is_internal_note", "created_at");

-- CreateIndex
CREATE INDEX "support_messages_author_user_id_idx" ON "support_messages"("author_user_id");

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_admin_id_fkey" FOREIGN KEY ("assigned_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
