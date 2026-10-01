import {
  getBookingFunnelAnalytics,
  getCohortRetentionAnalytics,
  evaluateFeatureFlag,
  getExperimentGuardrailStatus,
} from '@/modules/analytics/application/experimentation-analytics-service';

describe('Phase 99 — Product Analytics & Experimentation Platform', () => {
  it('calculates booking funnel stage conversion rates and visitor dropoffs', async () => {
    const funnel = await getBookingFunnelAnalytics();

    expect(funnel.stages.length).toBe(5);
    expect(funnel.totalVisitors).toBe(10000);
    expect(funnel.overallConversionRatePercent).toBeGreaterThan(0);
    expect(funnel.stages[0].stageName).toBe('LANDING');
    expect(funnel.stages[4].stageName).toBe('TRIP_COMPLETED');
  });

  it('retrieves cohort-based 30d, 60d, 90d customer retention metrics', async () => {
    const cohorts = await getCohortRetentionAnalytics();

    expect(cohorts.length).toBe(3);
    expect(cohorts[0].retentionRate30d).toBeGreaterThan(cohorts[0].retentionRate90d);
  });

  it('evaluates deterministic feature flag variants for A/B testing', () => {
    const resultA = evaluateFeatureFlag({ experimentKey: 'exp_concierge_v2', userId: 'user-001' });
    const resultB = evaluateFeatureFlag({ experimentKey: 'exp_concierge_v2', userId: 'user-001' });

    expect(resultA.assignedVariant).toBe(resultB.assignedVariant);
    expect(['control', 'treatment_a', 'treatment_b']).toContain(resultA.assignedVariant);
  });

  it('triggers automated experiment rollback when error rate exceeds guardrail', () => {
    const normal = getExperimentGuardrailStatus('exp_test_1', 0.8);
    expect(normal.status).toBe('RUNNING');
    expect(normal.rollbackTriggered).toBe(false);

    const breached = getExperimentGuardrailStatus('exp_test_1', 3.4);
    expect(breached.status).toBe('ROLLED_BACK');
    expect(breached.rollbackTriggered).toBe(true);
    expect(breached.rollbackReason).toContain('exceeded maximum guardrail threshold');
  });
});
