-- CreateEnum
CREATE TYPE "tax_invoice_status" AS ENUM ('ISSUED', 'CANCELLED', 'CREDIT_NOTE_ISSUED');

-- CreateTable
CREATE TABLE "tax_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "booking_id" UUID,
    "payment_id" UUID,
    "subtotal_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "tax_amount" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "tax_invoice_status" NOT NULL DEFAULT 'ISSUED',
    "supplier_snapshot" JSONB NOT NULL,
    "customer_snapshot" JSONB NOT NULL,
    "tax_details" JSONB,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tax_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_favorite_drivers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "driver_profile_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_favorite_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_invoices_invoice_number_key" ON "tax_invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "tax_invoices_booking_id_key" ON "tax_invoices"("booking_id");

-- CreateIndex
CREATE INDEX "tax_invoices_customer_id_created_at_idx" ON "tax_invoices"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "tax_invoices_status_created_at_idx" ON "tax_invoices"("status", "created_at");

-- CreateIndex
CREATE INDEX "customer_favorite_drivers_customer_id_created_at_idx" ON "customer_favorite_drivers"("customer_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_favorite_drivers_customer_id_driver_profile_id_key" ON "customer_favorite_drivers"("customer_id", "driver_profile_id");

-- AddForeignKey
ALTER TABLE "tax_invoices" ADD CONSTRAINT "tax_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_invoices" ADD CONSTRAINT "tax_invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_invoices" ADD CONSTRAINT "tax_invoices_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_favorite_drivers" ADD CONSTRAINT "customer_favorite_drivers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_favorite_drivers" ADD CONSTRAINT "customer_favorite_drivers_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
