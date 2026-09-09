import type {
  PaymentStatus,
  PaymentAttemptStatus,
  WebhookProcessingStatus,
  LedgerBalanceSide,
  FinancialTransactionType,
  SettlementStatus,
  RefundStatus,
  WalletChangeType,
} from '@prisma/client';

export type {
  PaymentStatus,
  PaymentAttemptStatus,
  WebhookProcessingStatus,
  LedgerBalanceSide,
  FinancialTransactionType,
  SettlementStatus,
  RefundStatus,
  WalletChangeType,
};

/** One balanced side of a FinancialTransaction being posted. */
export interface LedgerPosting {
  accountCode: string;
  debitAmount: string;
  creditAmount: string;
}

export interface PostFinancialTransactionInput {
  transactionType: FinancialTransactionType;
  referenceEntityType: string;
  referenceEntityId: string;
  idempotencyKey?: string | null;
  description: string;
  reversesTransactionId?: string | null;
  metadata?: Record<string, unknown> | null;
  postings: LedgerPosting[];
}
