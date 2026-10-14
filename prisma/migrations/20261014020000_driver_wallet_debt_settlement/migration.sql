-- Phase: Driver wallet debt visibility & settlement.
--
-- captureCashPayment (payment-service.ts) correctly debits a driver's
-- DriverWallet.availableBalance by the commission owed whenever they collect
-- a cash fare directly (the platform never touches that cash), but every
-- such debit was mislabeled 'EARNING_RECOGNIZED' — the same type used for a
-- genuine credit — making the wallet ledger unable to show a driver *why*
-- their balance went negative. Likewise referral rewards credited to a
-- driver referrer were mislabeled 'EARNING_RECOGNIZED' instead of their own
-- type. This migration adds three correctly-named WalletChangeType values
-- and a new DriverWalletTopup model + FinancialTransactionType value so a
-- driver can pay down that debt via Razorpay (see wallet-topup-service.ts).

-- AlterEnum
ALTER TYPE "wallet_change_type" ADD VALUE 'CASH_TRIP_SETTLEMENT';

-- AlterEnum
ALTER TYPE "wallet_change_type" ADD VALUE 'DEBT_REPAYMENT';

-- AlterEnum
ALTER TYPE "wallet_change_type" ADD VALUE 'REFERRAL_REWARD';

-- AlterEnum
ALTER TYPE "financial_transaction_type" ADD VALUE 'DRIVER_DEBT_REPAID';

-- CreateTable
CREATE TABLE "driver_wallet_topups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driver_profile_id" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "payment_status" NOT NULL DEFAULT 'CREATED',
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "provider_order_id" TEXT,
    "provider_payment_id" TEXT,
    "financial_transaction_id" UUID,
    "failure_reason" TEXT,
    "captured_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_wallet_topups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "driver_wallet_topups_driver_profile_id_status_idx" ON "driver_wallet_topups"("driver_profile_id", "status");

-- AddForeignKey
ALTER TABLE "driver_wallet_topups" ADD CONSTRAINT "driver_wallet_topups_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "driver_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
