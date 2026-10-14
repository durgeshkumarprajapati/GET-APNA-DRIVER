-- The driver-side "Show Payment QR" screen previously displayed a
-- hardcoded, non-functional decorative graphic tied to a VPA string that
-- was never verified to be real, with zero reconciliation against any
-- actual payment. This column stores the real, Razorpay-hosted QR code
-- image URL (POST /v1/payments/qr_codes) so the driver shows a genuinely
-- scannable code tied to a real Payment row that the qr_code.credited
-- webhook can reconcile automatically.

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "qr_code_image_url" TEXT;
