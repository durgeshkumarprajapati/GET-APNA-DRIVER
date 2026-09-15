import { PaymentAdapter } from '../adapters/payment-adapter';
import type { RecoveryResult } from '../trip-reliability-types';

export class ReconciliationRecoveryHandler {
  private paymentAdapter = new PaymentAdapter();

  async recoverInvoiceFailure(bookingId: string): Promise<RecoveryResult> {
    const success = await this.paymentAdapter.retryTaxInvoiceGeneration(bookingId);

    return {
      success,
      actionTaken: success ? 'TAX_INVOICE_GENERATED' : 'TAX_INVOICE_RETRY_FAILED',
      notes: success ? 'Tax invoice generated idempotently.' : 'Failed to generate tax invoice.',
    };
  }

  async recoverPaymentReconciliation(bookingId: string): Promise<RecoveryResult> {
    const check = await this.paymentAdapter.checkPaymentState(bookingId);

    if (check.paymentCaptured) {
      return {
        success: true,
        actionTaken: 'PAYMENT_VERIFIED_CAPTURED',
        notes: 'Payment verified as captured upon reconciliation check.',
      };
    }

    return {
      success: false,
      actionTaken: 'PAYMENT_RECONCILIATION_FLAGGED',
      notes: 'Payment remains uncaptured; escalated to finance live ops.',
      escalated: true,
    };
  }
}
