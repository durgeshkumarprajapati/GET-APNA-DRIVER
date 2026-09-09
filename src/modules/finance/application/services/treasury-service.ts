import 'server-only';
import { PaymentStatus, RefundStatus, SettlementStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { redis } from '@/shared/redis/client';
import { logger } from '@/shared/logging/logger';
import { ZERO, toDecimal } from '../../domain/money';

export interface SettlementBucketMetric {
  count: number;
  amount: string;
}

export interface TreasuryMetrics {
  capturedPaymentsTotal: string;
  capturedPaymentsCount: number;
  platformRevenueTotal: string;
  driverPayableAvailable: string;
  driverPayableReserved: string;
  settlements: {
    pending: SettlementBucketMetric;
    processing: SettlementBucketMetric;
    paid: SettlementBucketMetric;
    failed: SettlementBucketMetric;
  };
  refundExposure: string;
  generatedAt: string;
}

/**
 * Cache key: `finance:treasury:metrics` (single global key — account-wide
 * operational data, not per-user).
 * TTL: 30s — long enough to absorb repeated dashboard polling, short enough
 *   that treasury figures are never meaningfully stale; same category as
 *   the existing admin-dashboard metrics cache (dashboard-service.ts).
 * Invalidation trigger: none explicit — time-based expiry only, same
 *   reasoning as the admin dashboard cache: this is operational-as-of-a-
 *   few-seconds-ago data, not a balance an action is gated on. No mutation
 *   anywhere reads through this cache to decide whether money moves — every
 *   settlement/payment/refund service function queries the real tables
 *   directly, never this cached snapshot.
 * Fallback behavior: any Redis error on read or write is caught and
 *   treated as a cache miss/no-op — always falls through to computing the
 *   real metrics fresh. A cache outage can never produce an incorrect
 *   financial mutation, only a slightly-more-expensive dashboard read.
 */
const TREASURY_CACHE_KEY = 'finance:treasury:metrics';
const TREASURY_CACHE_TTL_SECONDS = 30;

export async function getTreasuryMetrics(db: Db = prisma): Promise<TreasuryMetrics> {
  try {
    const cached = await redis.get(TREASURY_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as TreasuryMetrics;
    }
  } catch (err) {
    logger.warn({ err }, 'Treasury metrics cache read failed; computing fresh');
  }

  const metrics = await computeTreasuryMetrics(db);

  try {
    await redis.set(TREASURY_CACHE_KEY, JSON.stringify(metrics), 'EX', TREASURY_CACHE_TTL_SECONDS);
  } catch (err) {
    logger.warn({ err }, 'Treasury metrics cache write failed; continuing without cache');
  }

  return metrics;
}

async function computeTreasuryMetrics(db: Db): Promise<TreasuryMetrics> {
  const [
    capturedPaymentsAgg,
    walletAgg,
    pendingSettlements,
    processingSettlements,
    paidSettlements,
    failedSettlements,
    refundExposureAgg,
  ] = await Promise.all([
    db.payment.aggregate({
      where: { status: PaymentStatus.CAPTURED },
      _sum: { amount: true, commissionAmount: true },
      _count: true,
    }),
    db.driverWallet.aggregate({
      _sum: { availableBalance: true, reservedBalance: true },
    }),
    db.driverSettlement.aggregate({
      where: { status: SettlementStatus.PENDING },
      _sum: { amount: true },
      _count: true,
    }),
    db.driverSettlement.aggregate({
      where: { status: SettlementStatus.PROCESSING },
      _sum: { amount: true },
      _count: true,
    }),
    db.driverSettlement.aggregate({
      where: { status: SettlementStatus.PAID },
      _sum: { amountPaid: true },
      _count: true,
    }),
    db.driverSettlement.aggregate({
      where: { status: SettlementStatus.FAILED },
      _sum: { amount: true },
      _count: true,
    }),
    db.refund.aggregate({
      where: { status: { in: [RefundStatus.PENDING, RefundStatus.PROCESSING] } },
      _sum: { amount: true },
    }),
  ]);

  return {
    capturedPaymentsTotal: toDecimal(capturedPaymentsAgg._sum.amount ?? ZERO).toFixed(4),
    capturedPaymentsCount: capturedPaymentsAgg._count,
    platformRevenueTotal: toDecimal(capturedPaymentsAgg._sum.commissionAmount ?? ZERO).toFixed(4),
    driverPayableAvailable: toDecimal(walletAgg._sum.availableBalance ?? ZERO).toFixed(4),
    driverPayableReserved: toDecimal(walletAgg._sum.reservedBalance ?? ZERO).toFixed(4),
    settlements: {
      pending: {
        count: pendingSettlements._count,
        amount: toDecimal(pendingSettlements._sum.amount ?? ZERO).toFixed(4),
      },
      processing: {
        count: processingSettlements._count,
        amount: toDecimal(processingSettlements._sum.amount ?? ZERO).toFixed(4),
      },
      paid: {
        count: paidSettlements._count,
        amount: toDecimal(paidSettlements._sum.amountPaid ?? ZERO).toFixed(4),
      },
      failed: {
        count: failedSettlements._count,
        amount: toDecimal(failedSettlements._sum.amount ?? ZERO).toFixed(4),
      },
    },
    refundExposure: toDecimal(refundExposureAgg._sum.amount ?? ZERO).toFixed(4),
    generatedAt: new Date().toISOString(),
  };
}

export interface LedgerAccountBalance {
  accountCode: string;
  accountName: string;
  /** Sum of debits minus sum of credits across every posted entry for this account (its natural running balance). */
  balance: string;
}

/**
 * Real-time per-ledger-account balances, computed by summing LedgerEntry
 * rows — the ledger is always the source of truth (no cached/running
 * balance column exists anywhere, matching how the rest of this domain
 * already works; see ledger-service.ts). This is what backs the admin
 * "Vault" view: a ledger-visibility screen, not a second source of truth.
 */
export async function getLedgerAccountBalances(db: Db = prisma): Promise<LedgerAccountBalance[]> {
  // A DB-side groupBy aggregation, not a full row fetch — an account like
  // PAYMENT_PROVIDER_CLEARING can accumulate a very large number of entries
  // over time, so pulling every row into memory (the previous version of
  // this function) would be exactly the unbounded-query problem Phase 17/18
  // already fixed elsewhere in this codebase.
  const [accounts, sums] = await Promise.all([
    db.ledgerAccount.findMany({ orderBy: { code: 'asc' } }),
    db.ledgerEntry.groupBy({
      by: ['ledgerAccountId'],
      _sum: { debitAmount: true, creditAmount: true },
    }),
  ]);

  const sumByAccountId = new Map(sums.map((s) => [s.ledgerAccountId, s._sum]));

  return accounts.map((account) => {
    const sum = sumByAccountId.get(account.id);
    const balance = toDecimal(sum?.debitAmount ?? ZERO).sub(toDecimal(sum?.creditAmount ?? ZERO));
    return {
      accountCode: account.code,
      accountName: account.name,
      balance: balance.toFixed(4),
    };
  });
}
