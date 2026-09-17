import {
  RiskDecisionService,
  RiskEvaluationService,
  RiskActionService,
  RiskExplanationService,
} from '@/modules/risk';

describe('Phase 51 — Trust, Fraud & Risk Intelligence Engine Unit Tests', () => {
  it('should deterministically calculate score and assign correct RiskLevel thresholds', () => {
    // Score 0-24 -> LOW
    const lowRisk = RiskEvaluationService.evaluateRisk({
      subjectType: 'CUSTOMER',
      subjectId: 'cust_low_1',
      riskType: 'ROUTINE_CHECK',
    });
    expect(lowRisk.riskScore).toBeLessThan(25);
    expect(lowRisk.riskLevel).toBe('LOW');

    // High score from corroborated payment anomaly & velocity -> HIGH / CRITICAL
    const highRisk = RiskEvaluationService.evaluateRisk({
      subjectType: 'PAYMENT',
      subjectId: 'pay_sub_1',
      riskType: 'PAYMENT_ANOMALY',
      paymentContext: {
        userId: 'cust_high_1',
        failedPayments24h: 5,
        paymentRetryFrequency1h: 6,
        refundAnomaliesDetected: true,
        paymentStateMismatch: true,
      },
      additionalSignals: [
        {
          signalId: 'sig_1',
          category: 'PAYMENT',
          subjectType: 'PAYMENT',
          subjectId: 'pay_sub_1',
          name: 'PAYMENT_STATE_MISMATCH',
          description: 'Gateway ledger discrepancy',
          weight: 40,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    expect(highRisk.riskScore).toBeGreaterThanOrEqual(75);
    expect(highRisk.riskLevel).toBe('CRITICAL');
    expect(highRisk.confidence).toBe('HIGH');
    expect(highRisk.evidence.evidenceItems.length).toBeGreaterThan(0);
  });

  it('should generate deterministic fingerprints and deduplicate repeated evaluations', async () => {
    const req = {
      subjectType: 'DRIVER' as const,
      subjectId: 'drv_dedup_100',
      riskType: 'LOCATION_TELEMETRY_ANOMALY',
      locationContext: {
        driverId: 'drv_dedup_100',
        impossibleMovementSpeedKmh: 280,
        locationJumpKm: 80,
        staleTelemetryMinutes: 20,
        isActiveRide: true,
      },
    };

    const first = await RiskDecisionService.evaluateAndStore(req);
    const second = await RiskDecisionService.evaluateAndStore(req);

    expect(second.fingerprint).toBe(first.fingerprint);
    expect(second.riskId).toBe(first.riskId);
  });

  it('should transition status authoritatively via RiskDecisionService', async () => {
    const req = {
      subjectType: 'REFERRAL' as const,
      subjectId: 'ref_trans_1',
      riskType: 'REFERRAL_ABUSE',
      referralContext: {
        referrerId: 'user_a',
        refereeId: 'user_b',
        isSameUserOrDevice: true,
        circularReferralDetected: true,
        rapidReferralCount24h: 10,
      },
    };

    const decision = await RiskDecisionService.evaluateAndStore(req);
    expect(decision.status).toBe('REVIEW_REQUIRED');

    const acknowledged = await RiskDecisionService.updateStatus(
      decision.riskId,
      'ACKNOWLEDGED',
      'op_user_1',
    );
    expect(acknowledged).not.toBeNull();
    expect(acknowledged?.status).toBe('ACKNOWLEDGED');
    expect(acknowledged?.acknowledgedBy).toBe('op_user_1');
  });

  it('should execute risk actions idempotently guarded by lock', async () => {
    const req = {
      subjectType: 'ACCOUNT' as const,
      subjectId: 'acc_act_1',
      riskType: 'ACCOUNT_ABUSE',
      accountContext: {
        userId: 'acc_act_1',
        subjectType: 'ACCOUNT' as const,
        otpFailuresLast24h: 6,
        loginAttemptsLast1h: 12,
        multipleDevicesDetected: true,
      },
    };

    const decision = await RiskDecisionService.evaluateAndStore(req);
    const actionId = decision.recommendedActions[0].actionId;

    const res1 = await RiskActionService.executeAction({
      riskId: decision.riskId,
      actionId,
      operatorId: 'admin_test_1',
    });

    expect(res1.success).toBe(true);

    const res2 = await RiskActionService.executeAction({
      riskId: decision.riskId,
      actionId,
      operatorId: 'admin_test_1',
    });

    expect(res2.success).toBe(true);
    expect(res2.message).toContain('already executed');
  });

  it('should format clean explainability breakdown with RiskExplanationService', () => {
    const decision = RiskEvaluationService.evaluateRisk({
      subjectType: 'PROMOTION',
      subjectId: 'promo_code_99',
      riskType: 'PROMOTION_ABUSE',
      promotionContext: {
        promotionId: 'promo_code_99',
        userId: 'user_expl_1',
        failedPromoAttempts1h: 6,
        promoUsage24h: 8,
        unusualPromoRelationships: true,
      },
    });

    const explanation = RiskExplanationService.explainDecision(decision);
    expect(explanation.riskId).toBe(decision.riskId);
    expect(explanation.headline).toContain('PROMOTION');
    expect(explanation.keyFactors.length).toBeGreaterThan(0);
  });
});
