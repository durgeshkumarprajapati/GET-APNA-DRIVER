-- AlterTable
ALTER TABLE "refunds" ADD COLUMN "refund_number" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "refunds_refund_number_key" ON "refunds"("refund_number");
