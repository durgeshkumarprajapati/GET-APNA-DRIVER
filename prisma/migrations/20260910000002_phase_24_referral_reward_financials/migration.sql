-- AlterEnum
-- Adds a dedicated transaction type for referral rewards. Previously,
-- evaluateAndQualifyReferral() (src/modules/identity/application/services/
-- referral-service.ts) reused PAYMENT_CAPTURED for every referral-reward
-- posting, which mislabeled a non-payment financial event. No existing code
-- filters/reports on transaction_type = 'PAYMENT_CAPTURED' in a way that
-- assumed it meant "only real payments" (verified: only payment-service.ts
-- itself and an unrelated NotificationType enum value reference the string
-- "PAYMENT_CAPTURED"), so re-pointing referral postings at this new,
-- correctly-named type is a pure correctness fix, not a breaking change.
ALTER TYPE "financial_transaction_type" ADD VALUE 'REFERRAL_REWARD';

-- No table/column changes. The new CUSTOMER_PAYABLE ledger account (see
-- src/modules/finance/domain/ledger-accounts.ts) is a data row, not a
-- schema change — it is inserted by the existing idempotent
-- `prisma/seed.ts` upsert loop over LEDGER_ACCOUNT_CATALOG the same way
-- every other system ledger account already is. Run `npm run prisma:seed`
-- (or the project's normal seed step) after applying this migration so the
-- new account row actually exists before any REFERRAL_REWARD posting for a
-- customer referrer is attempted.
