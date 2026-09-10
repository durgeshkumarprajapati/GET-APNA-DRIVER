import type { LedgerBalanceSide } from '@prisma/client';

/**
 * Chart of accounts for the marketplace payment flow. See the block comment
 * above the Phase 8 models in prisma/schema.prisma for the full flow
 * explanation; each account's purpose is documented on its seed entry below.
 * Deliberately minimal — four accounts is the smallest set that correctly
 * models "customer pays -> platform earns commission -> driver is owed the
 * rest -> driver gets paid out", with a correct, reversible refund path.
 */
export const LEDGER_ACCOUNT_CODES = {
  PAYMENT_PROVIDER_CLEARING: 'PAYMENT_PROVIDER_CLEARING',
  PLATFORM_REVENUE_COMMISSION: 'PLATFORM_REVENUE_COMMISSION',
  DRIVER_PAYABLE: 'DRIVER_PAYABLE',
  SETTLEMENT_CLEARING: 'SETTLEMENT_CLEARING',
  PLATFORM_BANK_ACCOUNT: 'PLATFORM_BANK_ACCOUNT',
  MARKETING_REFERRAL_EXPENSE: 'MARKETING_REFERRAL_EXPENSE',
  PROMOTION_DISCOUNT_EXPENSE: 'PROMOTION_DISCOUNT_EXPENSE',
} as const;

export type LedgerAccountCode = (typeof LEDGER_ACCOUNT_CODES)[keyof typeof LEDGER_ACCOUNT_CODES];

export interface LedgerAccountSeedDefinition {
  code: LedgerAccountCode;
  name: string;
  description: string;
  normalBalance: LedgerBalanceSide;
}

export const LEDGER_ACCOUNT_CATALOG: readonly LedgerAccountSeedDefinition[] = [
  {
    code: LEDGER_ACCOUNT_CODES.PAYMENT_PROVIDER_CLEARING,
    name: 'Payment Provider Clearing',
    description:
      "Funds Razorpay holds/has settled to the platform on the platform's behalf. Debited on capture, credited on refund.",
    normalBalance: 'DEBIT',
  },
  {
    code: LEDGER_ACCOUNT_CODES.PLATFORM_REVENUE_COMMISSION,
    name: 'Platform Commission Revenue',
    description:
      'Commission the platform earns on captured bookings. Reversed proportionally on refund.',
    normalBalance: 'CREDIT',
  },
  {
    code: LEDGER_ACCOUNT_CODES.DRIVER_PAYABLE,
    name: 'Driver Payable',
    description:
      'What the platform owes drivers for completed, paid trips. Credited on capture, debited on refund (clawback) and on settlement creation.',
    normalBalance: 'CREDIT',
  },
  {
    code: LEDGER_ACCOUNT_CODES.SETTLEMENT_CLEARING,
    name: 'Settlement Clearing',
    description:
      'Driver-payable amounts earmarked for payout by an in-flight settlement. Reversed if that settlement fails; discharged (debited) when the settlement is confirmed paid.',
    normalBalance: 'CREDIT',
  },
  {
    code: LEDGER_ACCOUNT_CODES.PLATFORM_BANK_ACCOUNT,
    name: 'Platform Bank Account',
    description:
      "The platform's operating bank account. Credited (decreased) when a driver settlement is confirmed paid. Razorpay's own settlement of collected funds into this account is out of scope for this phase (no bank reconciliation yet), so this account is not expected to balance against a real statement — it exists to close the settlement double-entry correctly, not to model cash inflows.",
    normalBalance: 'DEBIT',
  },
  {
    code: LEDGER_ACCOUNT_CODES.MARKETING_REFERRAL_EXPENSE,
    name: 'Marketing & Referral Expense',
    description:
      'Platform promotional expenses for customer and driver referral milestone rewards. Debited when referral rewards are granted.',
    normalBalance: 'DEBIT',
  },
  {
    code: LEDGER_ACCOUNT_CODES.PROMOTION_DISCOUNT_EXPENSE,
    name: 'Promotion & Coupon Discount Expense',
    description:
      "The gap between a booking's gross fare and what the customer actually pays after a promotion/coupon discount. Debited at payment capture so commission and driver payable are still computed on the gross fare (the platform funds the discount, not the driver); reversed proportionally on refund.",
    normalBalance: 'DEBIT',
  },
];
