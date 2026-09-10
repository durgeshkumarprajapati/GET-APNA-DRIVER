import 'server-only';
import { Prisma, type Refund } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { getBoolean, getInteger } from '@/shared/config/configuration-service';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { paymentProvider } from '../../infrastructure/payment-provider';
import { postFinancialTransaction } from './ledger-service';
import { applyWalletChange } from './wallet-service';
import { validatePaymentStatusTransition } from '../../domain/payment-state-machine';
import { LEDGER_ACCOUNT_CODES } from '../../domain/ledger-accounts';
import { ZERO, isPositive, roundMoney, toDecimal, toMinorUnits } from '../../domain/money';
import type { LedgerPosting } from '../../domain/types';
import {
  DuplicateRefundIdempotencyError,
  InsufficientRefundableAmountError,
  PaymentNotFoundError,
  PaymentProviderError,
  RefundNotAllowedError,
  RefundNotFoundError,
} from '../../domain/errors';

export interface InitiateRefundInput {
  paymentId: string;
  /** Omit for a full refund of the remaining refundable amount. */
  amount?: string;
  reason?: string;
  idempotencyKey?: string | null;
}

export interface RefundSummary {
  id: string;
  paymentId: string;
  amount: string;
  currency: string;
  status: Refund['status'];
  reason: string | null;
  processedAt: string | null;
  createdAt: string;
}

function mapRefundToSummary(refund: Refund): RefundSummary {
  return {
    id: refund.id,
    paymentId: refund.paymentId,
    amount: refund.amount.toFixed(4),
    currency: refund.currency,
    status: refund.status,
    reason: refund.reason,
    processedAt: refund.processedAt ? refund.processedAt.toISOString() : null,
    createdAt: refund.createdAt.toISOString(),
  };
}

/**
 * Initiates a full or partial refund of a captured payment. Enforces the
 * maximum-refundable-amount policy (sum of prior non-failed refunds, never
 * more than the original payment amount) as the primary duplicate/abuse
 * guard, plus an optional client idempotency key for exact-duplicate-request
 * detection. Calls the provider synchronously; if the provider reports the
 * refund as immediately processed (common for Razorpay instant refunds),
 * completes it in the same call — otherwise leaves it PROCESSING for
 * webhook-service.ts's `refund.processed`/`refund.failed` handling to finish.
 */
export async function initiateRefund(
  actorUserId: string,
  input: InitiateRefundInput,
  db: Db = prisma,
): Promise<RefundSummary> {
  if (input.idempotencyKey) {
    const existing = await db.refund.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      if (existing.initiatedBy !== actorUserId) {
        throw new DuplicateRefundIdempotencyError(input.idempotencyKey);
      }
      return mapRefundToSummary(existing);
    }
  }

  const refundsEnabled = await getBoolean('finance.refund.enabled', true, db);
  if (!refundsEnabled) {
    throw new RefundNotAllowedError('Refunds are currently disabled');
  }

  const payment = await db.payment.findUnique({ where: { id: input.paymentId } });
  if (!payment) {
    throw new PaymentNotFoundError(input.paymentId);
  }
  if (payment.status !== 'CAPTURED' && payment.status !== 'PARTIALLY_REFUNDED') {
    throw new RefundNotAllowedError(`Payment status ${payment.status} is not refundable`);
  }
  if (!payment.providerPaymentId) {
    throw new RefundNotAllowedError('Payment has no provider payment reference');
  }

  const maxWindowDays = await getInteger('finance.refund.max_refund_window_days', 30, db);
  if (payment.capturedAt) {
    const windowEndMs = payment.capturedAt.getTime() + maxWindowDays * 24 * 60 * 60 * 1000;
    if (Date.now() > windowEndMs) {
      throw new RefundNotAllowedError(`Refund window of ${maxWindowDays} days has elapsed`);
    }
  }

  const priorRefunds = await db.refund.findMany({
    where: { paymentId: payment.id, status: { in: ['PENDING', 'PROCESSING', 'PROCESSED'] } },
  });
  const alreadyRefunded = priorRefunds.reduce((sum, r) => sum.add(toDecimal(r.amount)), ZERO);
  const maxRefundable = roundMoney(toDecimal(payment.amount).sub(alreadyRefunded));

  const requestedAmount = input.amount ? toDecimal(input.amount) : maxRefundable;
  if (!isPositive(requestedAmount)) {
    throw new RefundNotAllowedError('Refund amount must be greater than zero');
  }
  if (requestedAmount.greaterThan(maxRefundable)) {
    throw new InsufficientRefundableAmountError(
      requestedAmount.toFixed(4),
      maxRefundable.toFixed(4),
    );
  }

  const refund = await db.refund.create({
    data: {
      paymentId: payment.id,
      amount: roundMoney(requestedAmount).toFixed(4),
      currency: payment.currency,
      status: 'PENDING',
      reason: input.reason ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      initiatedBy: actorUserId,
    },
  });

  await recordAuditLog(db, {
    actorUserId,
    action: 'finance.refund.initiated',
    entityType: 'Refund',
    entityId: refund.id,
    beforeState: null,
    afterState: { amount: refund.amount.toFixed(4), paymentId: payment.id },
    requestMetadata: null,
  });

  let providerResult;
  try {
    providerResult = await paymentProvider.initiateRefund({
      providerPaymentId: payment.providerPaymentId,
      amountMinorUnits: toMinorUnits(requestedAmount),
      notes: { refundId: refund.id, paymentId: payment.id },
    });
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Unknown provider error';
    await db.refund.update({
      where: { id: refund.id },
      data: { status: 'FAILED', failureReason: reason },
    });
    throw new PaymentProviderError(reason);
  }

  const afterProviderCall = await db.refund.update({
    where: { id: refund.id },
    data: { providerRefundId: providerResult.providerRefundId, status: 'PROCESSING' },
  });

  if (providerResult.status === 'processed') {
    return completeRefund(
      {
        refundId: refund.id,
        providerRefundId: providerResult.providerRefundId,
        source: 'sync',
      },
      db,
    );
  }

  return mapRefundToSummary(afterProviderCall);
}

export interface CompleteRefundInput {
  refundId: string;
  providerRefundId: string;
  source: 'sync' | 'webhook';
}

/**
 * Finalizes a refund the provider has confirmed processed: posts the exact
 * proportional reversal of the original capture's ledger entries (using the
 * commission rate *snapshot* on the payment, never current configuration),
 * claws back the driver's earning, and moves the Payment to
 * PARTIALLY_REFUNDED or REFUNDED depending on how much has now been
 * refunded in total. Idempotent — a duplicate call for an already-PROCESSED
 * refund is a safe no-op.
 *
 * If the driver's wallet no longer has enough available balance to absorb
 * the clawback (e.g. the earning was already settled/paid out), the wallet
 * is deliberately allowed to go negative rather than blocking the refund —
 * the customer's money was refunded regardless of what happened to the
 * driver's payout since. A negative driver balance is a real receivable the
 * platform now holds against that driver's future earnings; this policy is
 * intentional, not a silently-ignored edge case, and is a reasonable
 * candidate for a dedicated collections workflow in a later phase.
 */
export async function completeRefund(
  input: CompleteRefundInput,
  db: Db = prisma,
): Promise<RefundSummary> {
  return db.$transaction(async (tx: Db) => {
    const refund = await tx.refund.findUnique({ where: { id: input.refundId } });
    if (!refund) {
      throw new RefundNotFoundError(input.refundId);
    }
    if (refund.status === 'PROCESSED') {
      return mapRefundToSummary(refund);
    }

    const payment = await tx.payment.findUniqueOrThrow({ where: { id: refund.paymentId } });

    const refundAmount = toDecimal(refund.amount);
    const hasDiscount = payment.discountAmount && isPositive(toDecimal(payment.discountAmount));

    let commissionReversal: Prisma.Decimal;
    let driverReversal: Prisma.Decimal;
    let discountReversal = ZERO;
    const postings: LedgerPosting[] = [];

    if (!hasDiscount) {
      // No promotion on this payment: unchanged from the original formula.
      const commissionPercentage = payment.commissionPercentageSnapshot
        ? toDecimal(payment.commissionPercentageSnapshot)
        : ZERO;
      commissionReversal = roundMoney(refundAmount.mul(commissionPercentage).div(100));
      driverReversal = roundMoney(refundAmount.sub(commissionReversal));
    } else {
      // A discounted payment: `refundAmount` is a fraction of the amount
      // actually charged (payment.amount), which is smaller than the gross
      // fare that commission/driverEarnings were computed on at capture. So
      // the commission and discount-expense reversals must be scaled by
      // that same fraction of the *captured* amounts, and driverReversal
      // absorbs whatever remainder balances the transaction exactly (the
      // same "remainder absorbs rounding" convention calculateCommission
      // already uses at capture time) — reversing a fixed percentage of
      // refundAmount alone (the no-discount formula) would not balance,
      // since payment.amount + payment.discountAmount = grossAmount, not
      // payment.amount alone.
      const capturedAmount = toDecimal(payment.amount);
      const capturedCommission = toDecimal(payment.commissionAmount ?? '0');
      const capturedDiscount = toDecimal(payment.discountAmount ?? '0');
      const refundRatio = capturedAmount.isZero() ? ZERO : refundAmount.div(capturedAmount);

      commissionReversal = roundMoney(capturedCommission.mul(refundRatio));
      discountReversal = roundMoney(capturedDiscount.mul(refundRatio));
      driverReversal = roundMoney(refundAmount.add(discountReversal).sub(commissionReversal));

      postings.push({
        accountCode: LEDGER_ACCOUNT_CODES.PROMOTION_DISCOUNT_EXPENSE,
        debitAmount: '0',
        creditAmount: discountReversal.toFixed(4),
      });
    }

    postings.push(
      {
        accountCode: LEDGER_ACCOUNT_CODES.PLATFORM_REVENUE_COMMISSION,
        debitAmount: commissionReversal.toFixed(4),
        creditAmount: '0',
      },
      {
        accountCode: LEDGER_ACCOUNT_CODES.DRIVER_PAYABLE,
        debitAmount: driverReversal.toFixed(4),
        creditAmount: '0',
      },
      {
        accountCode: LEDGER_ACCOUNT_CODES.PAYMENT_PROVIDER_CLEARING,
        debitAmount: '0',
        creditAmount: refundAmount.toFixed(4),
      },
    );

    const financialTransaction = await postFinancialTransaction(
      {
        transactionType: 'PAYMENT_REFUNDED',
        referenceEntityType: 'Refund',
        referenceEntityId: refund.id,
        idempotencyKey: `refund_processed:${refund.id}`,
        description: `Refund processed for payment ${payment.id}`,
        postings,
      },
      tx,
    );

    if (payment.driverProfileId && isPositive(driverReversal)) {
      await applyWalletChange(
        {
          driverProfileId: payment.driverProfileId,
          financialTransactionId: financialTransaction.id,
          changeType: 'EARNING_REVERSED',
          availableDelta: driverReversal.mul(-1).toFixed(4),
          totalEarnedDelta: driverReversal.mul(-1).toFixed(4),
        },
        tx,
      );
    }

    const updatedRefund = await tx.refund.update({
      where: { id: refund.id },
      data: {
        status: 'PROCESSED',
        providerRefundId: input.providerRefundId,
        processedAt: new Date(),
        financialTransactionId: financialTransaction.id,
      },
    });

    const processedRefunds = await tx.refund.findMany({
      where: { paymentId: payment.id, status: 'PROCESSED' },
    });
    const totalRefunded = processedRefunds.reduce((sum, r) => sum.add(toDecimal(r.amount)), ZERO);
    const newPaymentStatus = roundMoney(totalRefunded).greaterThanOrEqualTo(
      roundMoney(toDecimal(payment.amount)),
    )
      ? 'REFUNDED'
      : 'PARTIALLY_REFUNDED';

    validatePaymentStatusTransition(payment.status, newPaymentStatus);
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: { status: newPaymentStatus },
    });

    await recordAuditLog(tx, {
      actorUserId: null,
      action: 'finance.refund.completed',
      entityType: 'Refund',
      entityId: refund.id,
      beforeState: { status: refund.status },
      afterState: { status: 'PROCESSED', amount: refund.amount.toFixed(4) },
      requestMetadata: { source: input.source },
    });

    await insertOutboxEvent(tx, {
      eventType: 'payment.refunded',
      aggregateType: 'Payment',
      aggregateId: payment.id,
      payload: {
        paymentId: payment.id,
        refundId: refund.id,
        amount: refund.amount.toFixed(4),
        newPaymentStatus: updatedPayment.status,
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'finance.transaction.posted',
      aggregateType: 'FinancialTransaction',
      aggregateId: financialTransaction.id,
      payload: { transactionType: 'PAYMENT_REFUNDED', referenceEntityId: refund.id },
    });

    if (payment.driverProfileId) {
      await insertOutboxEvent(tx, {
        eventType: 'driver.wallet.updated',
        aggregateType: 'DriverWallet',
        aggregateId: payment.driverProfileId,
        payload: { driverProfileId: payment.driverProfileId, changeType: 'EARNING_REVERSED' },
      });
    }

    return mapRefundToSummary(updatedRefund);
  });
}

export async function markRefundFailed(
  refundId: string,
  reason: string,
  db: Db = prisma,
): Promise<RefundSummary> {
  return db.$transaction(async (tx: Db) => {
    const refund = await tx.refund.findUnique({ where: { id: refundId } });
    if (!refund) {
      throw new RefundNotFoundError(refundId);
    }
    if (refund.status === 'PROCESSED' || refund.status === 'FAILED') {
      return mapRefundToSummary(refund);
    }

    const updated = await tx.refund.update({
      where: { id: refundId },
      data: { status: 'FAILED', failureReason: reason },
    });

    await recordAuditLog(tx, {
      actorUserId: null,
      action: 'finance.refund.failed',
      entityType: 'Refund',
      entityId: refundId,
      beforeState: { status: refund.status },
      afterState: { status: 'FAILED', reason },
      requestMetadata: null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'payment.refund_failed',
      aggregateType: 'Refund',
      aggregateId: refundId,
      payload: { refundId, paymentId: refund.paymentId, reason },
    });

    return mapRefundToSummary(updated);
  });
}

export async function listPaymentRefunds(
  paymentId: string,
  db: Db = prisma,
): Promise<RefundSummary[]> {
  const refunds = await db.refund.findMany({
    where: { paymentId },
    orderBy: { createdAt: 'desc' },
  });
  return refunds.map(mapRefundToSummary);
}

export { mapRefundToSummary };
