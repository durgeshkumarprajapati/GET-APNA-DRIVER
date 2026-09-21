import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { logger } from '@/shared/logging/logger';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { paymentProvider } from '@/modules/finance/infrastructure/payment-provider';
import { capturePayment, markPaymentFailed } from '@/modules/finance/application/services/payment-service';
import { toMinorUnits, toDecimal } from '@/modules/finance/domain/money';

export interface ReconciliationResult {
  inspected: number;
  captured: number;
  failed: number;
  unchanged: number;
  errors: string[];
}

/**
 * Sweeps payments stuck in `PROCESSING` status older than the specified threshold
 * (default: 15 minutes), checks provider status, and deterministically completes
 * or fails them.
 */
export async function reconcileStuckPayments(
  olderThanMinutes: number = 15,
  db: Db = prisma,
): Promise<ReconciliationResult> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

  const stuckPayments = await db.payment.findMany({
    where: {
      status: 'PROCESSING',
      updatedAt: { lte: cutoff },
    },
    take: 100,
  });

  const result: ReconciliationResult = {
    inspected: stuckPayments.length,
    captured: 0,
    failed: 0,
    unchanged: 0,
    errors: [],
  };

  for (const payment of stuckPayments) {
    try {
      if (payment.provider === 'cash') {
        // Cash payment stuck in PROCESSING: check age (> 60 mins without dual confirmation)
        const cashAgeMs = Date.now() - payment.createdAt.getTime();
        if (cashAgeMs > 60 * 60 * 1000) {
          await markPaymentFailed(payment.id, 'Cash confirmation expired (reconciled)', db);
          result.failed++;
        } else {
          result.unchanged++;
        }
        continue;
      }

      // Online/Razorpay payment reconciliation
      let providerStatus: string = 'unknown';
      const providerPaymentId: string | null = payment.providerPaymentId;

      if (payment.providerPaymentId) {
        const fetchRes = await paymentProvider.fetchPayment(payment.providerPaymentId);
        providerStatus = fetchRes.status;
      } else if (payment.providerOrderId) {
        const orderRes = await paymentProvider.fetchOrder(payment.providerOrderId);
        providerStatus = orderRes.status;
      }

      const normalizedStatus = providerStatus.toLowerCase();

      if (normalizedStatus === 'captured' || normalizedStatus === 'paid') {
        const finalProviderPaymentId =
          providerPaymentId ?? `RECONCILED_${payment.providerOrderId ?? payment.id}`;

        await capturePayment(
          {
            paymentId: payment.id,
            providerPaymentId: finalProviderPaymentId,
            amountMinorUnits: toMinorUnits(toDecimal(payment.amount)),
            source: 'webhook',
          },
          db,
        );
        result.captured++;
      } else if (
        normalizedStatus === 'failed' ||
        normalizedStatus === 'cancelled' ||
        normalizedStatus === 'expired'
      ) {
        await markPaymentFailed(
          payment.id,
          `Payment ${normalizedStatus} at provider (reconciled)`,
          db,
        );
        result.failed++;
      } else {
        // If payment is still 'created' or 'attempted' and older than 30 minutes, expire it
        const paymentAgeMs = Date.now() - payment.createdAt.getTime();
        if (paymentAgeMs > 30 * 60 * 1000) {
          await markPaymentFailed(payment.id, 'Payment expired at provider (reconciled)', db);
          result.failed++;
        } else {
          result.unchanged++;
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown reconciliation error';
      logger.error({ err, paymentId: payment.id }, 'Payment reconciliation failed for payment');
      result.errors.push(`Payment ${payment.id}: ${errorMsg}`);
    }
  }

  await recordAuditLog(db, {
    actorUserId: null,
    action: 'finance.payment.reconciled_batch',
    entityType: 'Payment',
    entityId: 'batch',
    beforeState: null,
    afterState: {
      inspected: result.inspected,
      captured: result.captured,
      failed: result.failed,
      unchanged: result.unchanged,
      errorCount: result.errors.length,
    },
    requestMetadata: { olderThanMinutes },
  });

  return result;
}
