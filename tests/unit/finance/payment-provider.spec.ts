import { MockPaymentProvider } from '@/modules/finance/infrastructure/payment-provider';

describe('MockPaymentProvider', () => {
  const provider = new MockPaymentProvider();

  it('creates a deterministic mock order with no real network call', async () => {
    const order = await provider.createOrder({
      amountMinorUnits: 15000,
      currency: 'INR',
      receipt: 'r1',
    });
    expect(order.providerOrderId).toMatch(/^order_mock_/);
    expect(order.amountMinorUnits).toBe(15000);
    expect(order.status).toBe('created');
  });

  it('verifies a correctly-signed checkout completion', () => {
    const signature = MockPaymentProvider.signMockCheckout('order_1', 'pay_1');
    expect(
      provider.verifyPaymentSignature({
        providerOrderId: 'order_1',
        providerPaymentId: 'pay_1',
        signature,
      }),
    ).toBe(true);
  });

  it('rejects a checkout completion with a tampered signature', () => {
    expect(
      provider.verifyPaymentSignature({
        providerOrderId: 'order_1',
        providerPaymentId: 'pay_1',
        signature: 'not-the-real-signature',
      }),
    ).toBe(false);
  });

  it('rejects a signature computed for a different order/payment pair', () => {
    const signature = MockPaymentProvider.signMockCheckout('order_1', 'pay_1');
    expect(
      provider.verifyPaymentSignature({
        providerOrderId: 'order_2',
        providerPaymentId: 'pay_1',
        signature,
      }),
    ).toBe(false);
  });

  it('verifies a correctly-signed webhook body', () => {
    const rawBody = JSON.stringify({ event: 'payment.captured' });
    const signature = MockPaymentProvider.signMockWebhook(rawBody);
    expect(provider.verifyWebhookSignature(rawBody, signature)).toBe(true);
  });

  it('rejects a webhook body that does not match its signature', () => {
    const rawBody = JSON.stringify({ event: 'payment.captured' });
    const signature = MockPaymentProvider.signMockWebhook(rawBody);
    const tamperedBody = JSON.stringify({ event: 'payment.failed' });
    expect(provider.verifyWebhookSignature(tamperedBody, signature)).toBe(false);
  });

  it('initiates a deterministic mock refund with no real network call', async () => {
    const refund = await provider.initiateRefund({
      providerPaymentId: 'pay_1',
      amountMinorUnits: 5000,
    });
    expect(refund.providerRefundId).toMatch(/^rfnd_mock_/);
    expect(refund.status).toBe('processed');
    expect(refund.amountMinorUnits).toBe(5000);
  });
});
