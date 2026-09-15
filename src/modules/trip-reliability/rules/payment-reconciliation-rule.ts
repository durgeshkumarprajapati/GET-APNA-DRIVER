import type { RuleEvaluationInput, RuleEvaluationResult } from '../trip-reliability-types';

export function evaluatePaymentReconciliation(input: RuleEvaluationInput): RuleEvaluationResult | null {
  const isCompleted = input.status === 'TRIP_COMPLETED' || input.status === 'COMPLETED';

  if (isCompleted) {
    if (input.finalFareAmount && input.finalFareAmount > 0 && !input.hasTaxInvoice) {
      return {
        detected: true,
        type: 'INVOICE_FAILURE',
        severity: 'MEDIUM',
        confidence: 'HIGH',
        reason: 'Trip completed and fare captured but tax invoice generation failed or is missing.',
        metadata: { finalFareAmount: input.finalFareAmount },
      };
    }

    if (input.paymentCaptured === false) {
      return {
        detected: true,
        type: 'PAYMENT_RECONCILIATION',
        severity: 'HIGH',
        confidence: 'HIGH',
        reason: 'Trip completed but payment status is uncaptured or inconsistent.',
        metadata: { finalFareAmount: input.finalFareAmount },
      };
    }
  }

  return null;
}
