import { SloService } from '@/modules/observability/services/slo-service';
import { OperationalMetricsRepository } from '@/modules/observability/repositories/operational-metrics-repository';
import type { Db } from '@/shared/database/prisma';

jest.mock('@/modules/observability/repositories/operational-metrics-repository');

describe('SloService', () => {
  it('should evaluate all SLOs and report compliance', async () => {
    (OperationalMetricsRepository.getMetricAggregates as jest.Mock).mockResolvedValue({
      count: 1000,
      errorCount: 1,
      avgDurationMs: 120,
      errorRatePercent: 0.1,
      buckets: [],
    });

    const reports = await SloService.evaluateAllSlos({} as unknown as Db);

    expect(reports.length).toBeGreaterThan(0);
    const apiAvail = reports.find((r) => r.serviceName === 'API Gateway & Routes');
    expect(apiAvail).toBeDefined();
    expect(apiAvail?.isCompliant).toBe(true);
    expect(apiAvail?.actualPercent).toBe(99.9);
  });
});
