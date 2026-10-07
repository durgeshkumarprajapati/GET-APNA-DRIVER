import {
  evaluateCoreWebVitals,
  getNetworkAdaptiveConfig,
  getMobilePerformanceReport,
} from '@/modules/observability/application/mobile-performance-service';

describe('Phase 98 — Application Performance & Mobile Excellence', () => {
  it('evaluates Core Web Vitals and assigns correct score grades', () => {
    const excellent = evaluateCoreWebVitals({ lcpMs: 1200, fidMs: 25, clsScore: 0.01, ttfbMs: 200 });
    expect(excellent.scoreGrade).toBe('EXCELLENT');

    const poor = evaluateCoreWebVitals({ lcpMs: 4500, fidMs: 350, clsScore: 0.3, ttfbMs: 2000 });
    expect(poor.scoreGrade).toBe('POOR');
  });

  it('adjusts image quality and prefetching based on network connection type', () => {
    const slowNet = getNetworkAdaptiveConfig('3G');
    expect(slowNet.saveDataMode).toBe(true);
    expect(slowNet.recommendedImageQuality).toBe(60);
    expect(slowNet.prefetchEnabled).toBe(false);

    const fastNet = getNetworkAdaptiveConfig('WIFI');
    expect(fastNet.saveDataMode).toBe(false);
    expect(fastNet.recommendedImageQuality).toBe(85);
    expect(fastNet.prefetchEnabled).toBe(true);
  });

  it('generates mobile performance report with query and accessibility diagnostics', async () => {
    const report = await getMobilePerformanceReport('4G');

    expect(report.webVitals.scoreGrade).toBeDefined();
    expect(report.queryOptimizations.length).toBeGreaterThan(0);
    expect(report.accessibilityAudit.wcagComplianceLevel).toBe('AA');
    expect(report.accessibilityAudit.overallScore).toBeGreaterThanOrEqual(90);
  });
});
