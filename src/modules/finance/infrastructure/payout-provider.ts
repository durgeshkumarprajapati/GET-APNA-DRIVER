import 'server-only';
import crypto from 'node:crypto';
import { logger } from '@/shared/logging/logger';

export interface InitiatePayoutInput {
  settlementId: string;
  driverProfileId: string;
  amountMinorUnits: number;
  currency: string;
}

export interface InitiatePayoutResult {
  payoutReference: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  /** Name of the provider that actually handled this, persisted on DriverSettlement.payoutProvider. */
  providerName: string;
}

export interface PayoutStatusResult {
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  failureReason?: string;
}

/**
 * Provider-independent contract for disbursing money OUT to a driver (IMPS/
 * UPI/bank transfer) — distinct from PaymentProvider (payment-provider.ts),
 * which only ever collects money FROM a customer. No real payout rail is
 * integrated yet (confirmed by repository audit: no IMPS/UPI SDK, no payout
 * webhook endpoint anywhere in the codebase before this file) — a real
 * provider (e.g. RazorpayX) would implement this same interface with actual
 * bank-rail calls, mirroring RazorpayPaymentProvider's shape in
 * payment-provider.ts, without any settlement-service.ts caller needing to
 * change.
 */
export interface PayoutProvider {
  initiatePayout(input: InitiatePayoutInput): Promise<InitiatePayoutResult>;
  getPayoutStatus(payoutReference: string): Promise<PayoutStatusResult>;
}

/**
 * Development/Test payout provider. Deterministic, in-memory, and does NOT
 * execute any real bank transfer, UPI, or IMPS movement of money — it only
 * simulates a provider's response shape so settlement-service.ts has
 * something real to call today. Every reference it issues is prefixed
 * `DEV-PAYOUT-` and every log line is marked `[DEV ONLY]` so it can never be
 * mistaken for a live disbursement in an audit trail.
 */
export class DevelopmentPayoutProvider implements PayoutProvider {
  private static readonly PROVIDER_NAME = 'development';

  async initiatePayout(input: InitiatePayoutInput): Promise<InitiatePayoutResult> {
    const payoutReference = `DEV-PAYOUT-${crypto.randomUUID()}`;
    logger.info(
      { payoutReference, settlementId: input.settlementId, driverProfileId: input.driverProfileId },
      '[DEV ONLY] Simulated payout initiated — no real funds were transferred',
    );
    return {
      payoutReference,
      status: 'PROCESSING',
      providerName: DevelopmentPayoutProvider.PROVIDER_NAME,
    };
  }

  async getPayoutStatus(payoutReference: string): Promise<PayoutStatusResult> {
    logger.info({ payoutReference }, '[DEV ONLY] Simulated payout status check');
    return { status: 'COMPLETED' };
  }
}

// No real payout rail exists yet — see the module doc comment above. When
// one is integrated, branch on env.NODE_ENV here exactly as
// payment-provider.ts already does for PaymentProvider.
export const payoutProvider: PayoutProvider = new DevelopmentPayoutProvider();
