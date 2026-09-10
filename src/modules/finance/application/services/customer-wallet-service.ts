import 'server-only';
import { Prisma, PaymentStatus, RefundStatus, ReferralStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { ZERO, roundMoney } from '../../domain/money';

/**
 * The customer wallet is a read-only projection over the existing financial
 * truth (Payment, Refund, Referral) — it never posts, stores, or derives its
 * own ledger. There is no per-customer prepaid balance/top-up concept
 * anywhere in this schema (only `DriverWallet` is a materialized balance,
 * and it is driver-only), so "Available Balance" here is defined as the
 * customer's total REWARDED referral earnings — the only real money a
 * customer can hold as unspent credit today. This is a deliberate, documented
 * scope decision, not a fabricated value: it is computed live from
 * `Referral.rewardAmount`, never stored on a new column.
 */
const CUSTOMER_VISIBLE_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.CAPTURED,
  PaymentStatus.PARTIALLY_REFUNDED,
  PaymentStatus.REFUNDED,
];

export type WalletTransactionType = 'BOOKING_PAYMENT' | 'REFUND' | 'REFERRAL_REWARD';
export type WalletTransactionDirection = 'CREDIT' | 'DEBIT';
export type WalletTransactionFilter =
  'all' | 'credit' | 'debit' | 'booking_payment' | 'refund' | 'referral_reward';

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  direction: WalletTransactionDirection;
  amount: string;
  currency: string;
  status: string;
  description: string;
  occurredAt: string;
  bookingId: string | null;
  paymentId: string | null;
  refundId: string | null;
  referralId: string | null;
  discountAmount: string | null;
}

export interface WalletSummary {
  totalCredits: string;
  totalDebits: string;
  totalRefunds: string;
  totalReferralRewards: string;
}

export interface CustomerWalletView {
  balance: string;
  currency: string;
  summary: WalletSummary;
  transactions: WalletTransaction[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface GetCustomerWalletOptions {
  page?: number;
  pageSize?: number;
  type?: WalletTransactionFilter;
}

/** Absolute safety cap on how much of the merged, multi-source feed a single request will scan/hold in memory. */
const MAX_MERGE_WINDOW = 500;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function decimalToAmount(value: Prisma.Decimal | null | undefined): string {
  return roundMoney(value ?? ZERO).toFixed(4);
}

async function computeWalletSummary(
  customerId: string,
  db: Db,
): Promise<{ balance: string; currency: string; summary: WalletSummary }> {
  const [debitAgg, refundAgg, referralAgg] = await Promise.all([
    db.payment.aggregate({
      where: { customerId, status: { in: CUSTOMER_VISIBLE_PAYMENT_STATUSES } },
      _sum: { amount: true },
    }),
    db.refund.aggregate({
      where: { status: RefundStatus.PROCESSED, payment: { customerId } },
      _sum: { amount: true },
    }),
    db.referral.aggregate({
      where: { referrerUserId: customerId, status: ReferralStatus.REWARDED },
      _sum: { rewardAmount: true },
    }),
  ]);

  const totalDebits = roundMoney(debitAgg._sum.amount ?? ZERO);
  const totalRefunds = roundMoney(refundAgg._sum.amount ?? ZERO);
  const totalReferralRewards = roundMoney(referralAgg._sum.rewardAmount ?? ZERO);
  const totalCredits = roundMoney(totalRefunds.add(totalReferralRewards));

  return {
    balance: totalReferralRewards.toFixed(4),
    currency: 'INR',
    summary: {
      totalCredits: totalCredits.toFixed(4),
      totalDebits: totalDebits.toFixed(4),
      totalRefunds: totalRefunds.toFixed(4),
      totalReferralRewards: totalReferralRewards.toFixed(4),
    },
  };
}

function mapPayment(payment: {
  id: string;
  bookingId: string;
  amount: Prisma.Decimal;
  currency: string;
  status: PaymentStatus;
  discountAmount: Prisma.Decimal | null;
  capturedAt: Date | null;
  createdAt: Date;
}): WalletTransaction {
  return {
    id: `payment:${payment.id}`,
    type: 'BOOKING_PAYMENT',
    direction: 'DEBIT',
    amount: decimalToAmount(payment.amount),
    currency: payment.currency,
    status: payment.status,
    description: 'Booking payment',
    occurredAt: (payment.capturedAt ?? payment.createdAt).toISOString(),
    bookingId: payment.bookingId,
    paymentId: payment.id,
    refundId: null,
    referralId: null,
    discountAmount: payment.discountAmount ? decimalToAmount(payment.discountAmount) : null,
  };
}

function mapRefund(refund: {
  id: string;
  paymentId: string;
  amount: Prisma.Decimal;
  currency: string;
  status: RefundStatus;
  processedAt: Date | null;
  createdAt: Date;
  payment: { bookingId: string };
}): WalletTransaction {
  return {
    id: `refund:${refund.id}`,
    type: 'REFUND',
    direction: 'CREDIT',
    amount: decimalToAmount(refund.amount),
    currency: refund.currency,
    status: refund.status,
    description: 'Refund',
    occurredAt: (refund.processedAt ?? refund.createdAt).toISOString(),
    bookingId: refund.payment.bookingId,
    paymentId: refund.paymentId,
    refundId: refund.id,
    referralId: null,
    discountAmount: null,
  };
}

function mapReferral(referral: {
  id: string;
  rewardAmount: Prisma.Decimal | null;
  rewardedAt: Date | null;
  createdAt: Date;
}): WalletTransaction {
  return {
    id: `referral:${referral.id}`,
    type: 'REFERRAL_REWARD',
    direction: 'CREDIT',
    amount: decimalToAmount(referral.rewardAmount),
    currency: 'INR',
    status: 'REWARDED',
    description: 'Referral reward',
    occurredAt: (referral.rewardedAt ?? referral.createdAt).toISOString(),
    bookingId: null,
    paymentId: null,
    refundId: null,
    referralId: referral.id,
    discountAmount: null,
  };
}

async function listBookingPayments(
  customerId: string,
  take: number,
  db: Db,
): Promise<WalletTransaction[]> {
  const payments = await db.payment.findMany({
    where: { customerId, status: { in: CUSTOMER_VISIBLE_PAYMENT_STATUSES } },
    orderBy: { createdAt: 'desc' },
    take,
  });
  return payments.map(mapPayment);
}

async function listRefunds(customerId: string, take: number, db: Db): Promise<WalletTransaction[]> {
  const refunds = await db.refund.findMany({
    where: { status: RefundStatus.PROCESSED, payment: { customerId } },
    include: { payment: { select: { bookingId: true } } },
    orderBy: { processedAt: 'desc' },
    take,
  });
  return refunds.map(mapRefund);
}

async function listReferralRewards(
  customerId: string,
  take: number,
  db: Db,
): Promise<WalletTransaction[]> {
  const referrals = await db.referral.findMany({
    where: { referrerUserId: customerId, status: ReferralStatus.REWARDED },
    orderBy: { rewardedAt: 'desc' },
    take,
  });
  return referrals.map(mapReferral);
}

async function countForFilter(
  customerId: string,
  filter: WalletTransactionFilter,
  db: Db,
): Promise<number> {
  const [paymentCount, refundCount, referralCount] = await Promise.all([
    filter === 'all' || filter === 'debit' || filter === 'booking_payment'
      ? db.payment.count({
          where: { customerId, status: { in: CUSTOMER_VISIBLE_PAYMENT_STATUSES } },
        })
      : Promise.resolve(0),
    filter === 'all' || filter === 'credit' || filter === 'refund'
      ? db.refund.count({ where: { status: RefundStatus.PROCESSED, payment: { customerId } } })
      : Promise.resolve(0),
    filter === 'all' || filter === 'credit' || filter === 'referral_reward'
      ? db.referral.count({
          where: { referrerUserId: customerId, status: ReferralStatus.REWARDED },
        })
      : Promise.resolve(0),
  ]);
  return paymentCount + refundCount + referralCount;
}

/**
 * Merges the (at most three) heterogeneous sources — there is no unified
 * customer-facing ledger table to page through directly. Each source is
 * fetched with `take: min(offset + pageSize, MAX_MERGE_WINDOW)` (the minimum
 * needed to correctly sort+slice the requested page across sources), merged
 * by `occurredAt` descending, then sliced to the requested window. This is
 * correct and bounded for realistic per-customer volumes; a customer with
 * more than MAX_MERGE_WINDOW transactions of a single kind would need a real
 * unified event stream for pagination beyond that point (see delivery
 * report's Known Limitations).
 */
async function listTransactionsPage(
  customerId: string,
  filter: WalletTransactionFilter,
  offset: number,
  pageSize: number,
  db: Db,
): Promise<WalletTransaction[]> {
  const take = Math.min(offset + pageSize, MAX_MERGE_WINDOW);

  const includePayments = filter === 'all' || filter === 'debit' || filter === 'booking_payment';
  const includeRefunds = filter === 'all' || filter === 'credit' || filter === 'refund';
  const includeReferrals = filter === 'all' || filter === 'credit' || filter === 'referral_reward';

  const isSingleSource =
    [includePayments, includeRefunds, includeReferrals].filter(Boolean).length === 1;

  if (isSingleSource) {
    // Efficient path: a single real DB source can page directly with skip/take.
    if (includePayments) {
      const payments = await db.payment.findMany({
        where: { customerId, status: { in: CUSTOMER_VISIBLE_PAYMENT_STATUSES } },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: pageSize,
      });
      return payments.map(mapPayment);
    }
    if (includeRefunds) {
      const refunds = await db.refund.findMany({
        where: { status: RefundStatus.PROCESSED, payment: { customerId } },
        include: { payment: { select: { bookingId: true } } },
        orderBy: { processedAt: 'desc' },
        skip: offset,
        take: pageSize,
      });
      return refunds.map(mapRefund);
    }
    const referrals = await db.referral.findMany({
      where: { referrerUserId: customerId, status: ReferralStatus.REWARDED },
      orderBy: { rewardedAt: 'desc' },
      skip: offset,
      take: pageSize,
    });
    return referrals.map(mapReferral);
  }

  const [payments, refunds, referrals] = await Promise.all([
    includePayments ? listBookingPayments(customerId, take, db) : Promise.resolve([]),
    includeRefunds ? listRefunds(customerId, take, db) : Promise.resolve([]),
    includeReferrals ? listReferralRewards(customerId, take, db) : Promise.resolve([]),
  ]);

  const merged = [...payments, ...refunds, ...referrals].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  return merged.slice(offset, offset + pageSize);
}

/**
 * Single entry point for the customer wallet — the only function a new
 * `/api/customer/wallet` route (or any future caller) should use. Ownership
 * is always the caller-supplied `customerId`; callers must derive it from
 * the authenticated session, never from a client-supplied parameter.
 */
export async function getCustomerWallet(
  customerId: string,
  options: GetCustomerWalletOptions = {},
  db: Db = prisma,
): Promise<CustomerWalletView> {
  const page = options.page && options.page > 0 ? Math.floor(options.page) : 1;
  const pageSize = options.pageSize
    ? Math.min(Math.max(1, Math.floor(options.pageSize)), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  const filter = options.type ?? 'all';
  const offset = (page - 1) * pageSize;

  const [{ balance, currency, summary }, transactions, total] = await Promise.all([
    computeWalletSummary(customerId, db),
    listTransactionsPage(customerId, filter, offset, pageSize, db),
    countForFilter(customerId, filter, db),
  ]);

  return {
    balance,
    currency,
    summary,
    transactions,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
