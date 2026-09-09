jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    paymentWebhookEvent: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    payment: { findFirst: jest.fn() },
    refund: { findFirst: jest.fn() },
  },
}));

jest.mock('@/shared/audit/audit-service', () => ({ recordAuditLog: jest.fn() }));

jest.mock('@/modules/finance/infrastructure/payment-provider', () => ({
  paymentProvider: { verifyWebhookSignature: jest.fn() },
}));

jest.mock('@/modules/finance/application/services/payment-service', () => ({
  capturePayment: jest.fn(),
  markPaymentFailed: jest.fn(),
}));

jest.mock('@/modules/finance/application/services/refund-service', () => ({
  completeRefund: jest.fn(),
  markRefundFailed: jest.fn(),
}));

import { processRazorpayWebhook } from '@/modules/finance/application/services/webhook-service';
import { prisma } from '@/shared/database/prisma';
import { paymentProvider } from '@/modules/finance/infrastructure/payment-provider';
import { capturePayment } from '@/modules/finance/application/services/payment-service';

const mockedPrisma = prisma as unknown as {
  paymentWebhookEvent: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  payment: { findFirst: jest.Mock };
  refund: { findFirst: jest.Mock };
};
const mockedVerify = paymentProvider.verifyWebhookSignature as jest.Mock;

describe('processRazorpayWebhook', () => {
  afterEach(() => jest.clearAllMocks());

  it('persists the event and rejects it when the signature is invalid, without dispatching', async () => {
    mockedVerify.mockReturnValue(false);
    mockedPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
    mockedPrisma.paymentWebhookEvent.create.mockResolvedValue({ id: 'webhook-1' });

    const result = await processRazorpayWebhook({
      rawBody: JSON.stringify({ event: 'payment.captured' }),
      signatureHeader: 'bad-signature',
      eventIdHeader: 'evt_1',
    });

    expect(result.outcome).toBe('signature_invalid');
    expect(mockedPrisma.paymentWebhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ signatureVerified: false }) }),
    );
    expect(capturePayment).not.toHaveBeenCalled();
  });

  it('is duplicate-safe: a delivery already PROCESSED is not reprocessed', async () => {
    mockedVerify.mockReturnValue(true);
    mockedPrisma.paymentWebhookEvent.findUnique.mockResolvedValue({
      id: 'webhook-1',
      processingStatus: 'PROCESSED',
    });

    const result = await processRazorpayWebhook({
      rawBody: JSON.stringify({ event: 'payment.captured' }),
      signatureHeader: 'good-signature',
      eventIdHeader: 'evt_1',
    });

    expect(result.outcome).toBe('duplicate');
    expect(mockedPrisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
    expect(capturePayment).not.toHaveBeenCalled();
  });

  it('retries processing (does not treat as a duplicate) a delivery that previously FAILED', async () => {
    mockedVerify.mockReturnValue(true);
    mockedPrisma.paymentWebhookEvent.findUnique.mockResolvedValue({
      id: 'webhook-1',
      processingStatus: 'FAILED',
    });
    mockedPrisma.payment.findFirst.mockResolvedValue({ id: 'payment-1' });
    (capturePayment as jest.Mock).mockResolvedValue({ id: 'payment-1', status: 'CAPTURED' });

    const rawBody = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1', amount: 15000 } } },
    });

    const result = await processRazorpayWebhook({
      rawBody,
      signatureHeader: 'good-signature',
      eventIdHeader: 'evt_1',
    });

    expect(result.outcome).toBe('processed');
    expect(capturePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 'payment-1',
        providerPaymentId: 'pay_1',
        source: 'webhook',
      }),
      expect.anything(),
    );
    expect(mockedPrisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
  });

  it('dispatches payment.captured to capturePayment by matching the stored providerOrderId', async () => {
    mockedVerify.mockReturnValue(true);
    mockedPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
    mockedPrisma.paymentWebhookEvent.create.mockResolvedValue({ id: 'webhook-2' });
    mockedPrisma.payment.findFirst.mockResolvedValue({ id: 'payment-2' });
    (capturePayment as jest.Mock).mockResolvedValue({ id: 'payment-2', status: 'CAPTURED' });

    const rawBody = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_2', order_id: 'order_2', amount: 5000 } } },
    });

    const result = await processRazorpayWebhook({
      rawBody,
      signatureHeader: 'sig',
      eventIdHeader: null,
    });

    expect(result.outcome).toBe('processed');
    expect(mockedPrisma.payment.findFirst).toHaveBeenCalledWith({
      where: { providerOrderId: 'order_2' },
    });
  });

  it('computes a stable providerEventId from the raw body when no event-id header is present, so retries dedupe', async () => {
    mockedVerify.mockReturnValue(true);
    mockedPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
    mockedPrisma.paymentWebhookEvent.create.mockResolvedValue({ id: 'webhook-3' });
    mockedPrisma.payment.findFirst.mockResolvedValue(null); // unknown order -> ignored

    const rawBody = JSON.stringify({ event: 'payment.captured', payload: {} });

    await processRazorpayWebhook({ rawBody, signatureHeader: 'sig', eventIdHeader: null });
    await processRazorpayWebhook({ rawBody, signatureHeader: 'sig', eventIdHeader: null });

    const firstCallKey =
      mockedPrisma.paymentWebhookEvent.findUnique.mock.calls[0][0].where.provider_providerEventId
        .providerEventId;
    const secondCallKey =
      mockedPrisma.paymentWebhookEvent.findUnique.mock.calls[1][0].where.provider_providerEventId
        .providerEventId;
    expect(firstCallKey).toBe(secondCallKey);
  });

  it('ignores an unrecognized event type without throwing', async () => {
    mockedVerify.mockReturnValue(true);
    mockedPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
    mockedPrisma.paymentWebhookEvent.create.mockResolvedValue({ id: 'webhook-4' });

    const result = await processRazorpayWebhook({
      rawBody: JSON.stringify({ event: 'order.paid' }),
      signatureHeader: 'sig',
      eventIdHeader: 'evt_4',
    });

    expect(result.outcome).toBe('ignored');
  });
});
