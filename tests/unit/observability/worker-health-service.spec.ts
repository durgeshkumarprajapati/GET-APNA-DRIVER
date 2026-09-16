import { WorkerHealthService } from '@/modules/observability/health/worker-health-service';
import { getOutboxStats } from '@/shared/outbox/outbox-admin-service';
import type { Db } from '@/shared/database/prisma';

jest.mock('@/shared/outbox/outbox-admin-service', () => ({
  getOutboxStats: jest.fn(),
}));

describe('WorkerHealthService', () => {
  it('should return HEALTHY when outbox backlog and failures are minimal', async () => {
    (getOutboxStats as jest.Mock).mockResolvedValue({
      pending: 5,
      processing: 1,
      processed: 100,
      failed: 0,
      oldestPendingAgeSeconds: 2,
      oldestProcessingAgeSeconds: 1,
    });

    const result = await WorkerHealthService.evaluateHealth({} as unknown as Db);

    expect(result.status).toBe('HEALTHY');
    expect(result.score).toBe(100);
  });

  it('should return CRITICAL when failed outbox events exceed 50', async () => {
    (getOutboxStats as jest.Mock).mockResolvedValue({
      pending: 10,
      processing: 2,
      processed: 100,
      failed: 60,
      oldestPendingAgeSeconds: 5,
      oldestProcessingAgeSeconds: 2,
    });

    const result = await WorkerHealthService.evaluateHealth({} as unknown as Db);

    expect(result.status).toBe('CRITICAL');
    expect(result.score).toBe(25);
  });
});

