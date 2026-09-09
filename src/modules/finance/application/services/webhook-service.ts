import 'server-only';
import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { logger } from '@/shared/logging/logger';
import { paymentProvider } from '../../infrastructure/payment-provider';
import { capturePayment, markPaymentFailed } from './payment-service';
import { completeRefund, markRefundFailed } from './refund-service';

export interface ProcessRazorpayWebhookInput {
  rawBody: string;
  signatureHeader: string | null;
  eventIdHeader: string | null;
}

export type WebhookOutcome =
  'processed' | 'ignored' | 'duplicate' | 'signature_invalid' | 'processing_failed';

export interface ProcessWebhookResult {
  outcome: WebhookOutcome;
  webhookEventId: string | null;
}

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: {
      entity?: { id?: string; order_id?: string; amount?: number; error_description?: string };
    };
    refund?: { entity?: { id?: string; payment_id?: string; amount?: number } };
  };
}

function computeProviderEventId(rawBody: string, eventIdHeader: string | null): string {
  // A `x-razorpay-event-id` header, when present, is Razorpay's own stable
  // id for this delivery. When absent, a content hash of the exact raw body
  // is used instead — Razorpay resends an identical payload on retry, so
  // this is equally stable across retries of the same logical event.
  return eventIdHeader ?? crypto.createHash('sha256').update(rawBody).digest('hex');
}

/**
 * Entry point for POST /api/webhooks/razorpay. Every relevant webhook is
 * persisted BEFORE processing — it is never silently discarded, even if
 * signature verification fails or processing later throws. Duplicate
 * deliveries of an already-successfully-processed event are recognized via
 * the (provider, providerEventId) unique constraint and are a safe no-op; a
 * delivery that previously failed mid-processing is retried using the same
 * row rather than being treated as a duplicate, so Razorpay's own retry
 * mechanism can actually recover a transient failure.
 */
export async function processRazorpayWebhook(
  input: ProcessRazorpayWebhookInput,
  db: Db = prisma,
): Promise<ProcessWebhookResult> {
  const signatureVerified = input.signatureHeader
    ? paymentProvider.verifyWebhookSignature(input.rawBody, input.signatureHeader)
    : false;

  let parsed: RazorpayWebhookPayload = {};
  try {
    parsed = JSON.parse(input.rawBody) as RazorpayWebhookPayload;
  } catch {
    logger.warn('Received a Razorpay webhook with an unparseable body');
  }
  const eventType = parsed.event ?? 'unknown';
  const providerEventId = computeProviderEventId(input.rawBody, input.eventIdHeader);

  const existing = await db.paymentWebhookEvent.findUnique({
    where: { provider_providerEventId: { provider: 'razorpay', providerEventId } },
  });

  if (
    existing &&
    (existing.processingStatus === 'PROCESSED' || existing.processingStatus === 'IGNORED')
  ) {
    return { outcome: 'duplicate', webhookEventId: existing.id };
  }

  const webhookEvent =
    existing ??
    (await db.paymentWebhookEvent.create({
      data: {
        provider: 'razorpay',
        providerEventId,
        eventType,
        payload: parsed as unknown as Prisma.InputJsonValue,
        signatureVerified,
        processingStatus: 'RECEIVED',
      },
    }));

  if (!signatureVerified) {
    await db.paymentWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        processingStatus: 'FAILED',
        errorDetails: 'Signature verification failed',
        processedAt: new Date(),
      },
    });
    await recordAuditLog(db, {
      actorUserId: null,
      action: 'finance.webhook.signature_invalid',
      entityType: 'PaymentWebhookEvent',
      entityId: webhookEvent.id,
      beforeState: null,
      afterState: { eventType },
      requestMetadata: null,
    });
    return { outcome: 'signature_invalid', webhookEventId: webhookEvent.id };
  }

  try {
    const outcome = await dispatchWebhookEvent(eventType, parsed.payload ?? {}, db);

    await db.paymentWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        processingStatus: outcome === 'ignored' ? 'IGNORED' : 'PROCESSED',
        processedAt: new Date(),
        errorDetails: null,
      },
    });

    return { outcome, webhookEventId: webhookEvent.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await db.paymentWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processingStatus: 'FAILED', errorDetails: message, processedAt: new Date() },
    });
    await recordAuditLog(db, {
      actorUserId: null,
      action: 'finance.webhook.processing_failed',
      entityType: 'PaymentWebhookEvent',
      entityId: webhookEvent.id,
      beforeState: null,
      afterState: { eventType, error: message },
      requestMetadata: null,
    });
    // Re-thrown deliberately: the event is durably persisted as FAILED
    // regardless, and letting this propagate to the route lets it respond
    // with a 5xx so Razorpay's own retry mechanism gives it another try —
    // the failure may be transient (e.g. a DB blip), and simply swallowing
    // it here would silently strand a legitimate event.
    throw error;
  }
}

async function dispatchWebhookEvent(
  eventType: string,
  payload: RazorpayWebhookPayload['payload'],
  db: Db,
): Promise<'processed' | 'ignored'> {
  switch (eventType) {
    case 'payment.captured': {
      const entity = payload?.payment?.entity;
      if (!entity?.id || !entity.order_id || entity.amount === undefined) {
        return 'ignored';
      }
      const payment = await db.payment.findFirst({ where: { providerOrderId: entity.order_id } });
      if (!payment) {
        logger.warn(
          { providerOrderId: entity.order_id },
          'payment.captured webhook for unknown order',
        );
        return 'ignored';
      }
      await capturePayment(
        {
          paymentId: payment.id,
          providerPaymentId: entity.id,
          amountMinorUnits: entity.amount,
          source: 'webhook',
        },
        db,
      );
      return 'processed';
    }

    case 'payment.failed': {
      const entity = payload?.payment?.entity;
      if (!entity?.order_id) {
        return 'ignored';
      }
      const payment = await db.payment.findFirst({ where: { providerOrderId: entity.order_id } });
      if (!payment) {
        return 'ignored';
      }
      await markPaymentFailed(
        payment.id,
        entity.error_description ?? 'Payment failed at provider',
        db,
      );
      return 'processed';
    }

    case 'refund.processed': {
      const entity = payload?.refund?.entity;
      if (!entity?.id) {
        return 'ignored';
      }
      const refund = await db.refund.findFirst({ where: { providerRefundId: entity.id } });
      if (!refund) {
        logger.warn({ providerRefundId: entity.id }, 'refund.processed webhook for unknown refund');
        return 'ignored';
      }
      await completeRefund(
        { refundId: refund.id, providerRefundId: entity.id, source: 'webhook' },
        db,
      );
      return 'processed';
    }

    case 'refund.failed': {
      const entity = payload?.refund?.entity;
      if (!entity?.id) {
        return 'ignored';
      }
      const refund = await db.refund.findFirst({ where: { providerRefundId: entity.id } });
      if (!refund) {
        return 'ignored';
      }
      await markRefundFailed(refund.id, 'Refund failed at provider', db);
      return 'processed';
    }

    default:
      return 'ignored';
  }
}
