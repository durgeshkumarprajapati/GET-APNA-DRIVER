import { evaluatePaymentReconciliation } from '@/modules/trip-reliability/rules/payment-reconciliation-rule';

describe('evaluatePaymentReconciliation', () => {
  it('should detect payment reconciliation incident when trip COMPLETED but payment not captured', () => {
    const input = {
      bookingId: 'b7',
      status: 'COMPLETED',
      tripCompletedAt: new Date(Date.now() - 20 * 60 * 1000),
      finalFareAmount: 450,
      hasTaxInvoice: true,
      paymentCaptured: false,
    };

    const evaluation = evaluatePaymentReconciliation(input);
    expect(evaluation).not.toBeNull();
    expect(evaluation?.detected).toBe(true);
    expect(evaluation?.type).toBe('PAYMENT_RECONCILIATION');
  });

  it('should not detect payment reconciliation incident when completed ride has payment captured and invoice present', () => {
    const input = {
      bookingId: 'b8',
      status: 'COMPLETED',
      tripCompletedAt: new Date(Date.now() - 20 * 60 * 1000),
      finalFareAmount: 450,
      hasTaxInvoice: true,
      paymentCaptured: true,
    };

    const evaluation = evaluatePaymentReconciliation(input);
    expect(evaluation).toBeNull();
  });
});
