-- AlterTable
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payment_method" TEXT,
ADD COLUMN IF NOT EXISTS "cash_customer_confirmed_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "cash_driver_confirmed_at" TIMESTAMPTZ(6);
