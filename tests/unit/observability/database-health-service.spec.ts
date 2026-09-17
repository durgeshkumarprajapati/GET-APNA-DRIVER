import { DatabaseHealthService } from '@/modules/observability/health/database-health-service';
import type { Db } from '@/shared/database/prisma';

describe('DatabaseHealthService', () => {
  it('should return HEALTHY status when $queryRaw succeeds quickly', async () => {
    const mockDb = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as Db;

    const result = await DatabaseHealthService.evaluateHealth(mockDb);

    expect(result.status).toBe('HEALTHY');
    expect(result.score).toBe(100);
    expect(result.category).toBe('STORAGE');
    expect(result.weight).toBe(0.15);
  });

  it('should return CRITICAL status when $queryRaw throws an error', async () => {
    const mockDb = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('Connection lost')),
    } as unknown as Db;

    const result = await DatabaseHealthService.evaluateHealth(mockDb);

    expect(result.status).toBe('CRITICAL');
    expect(result.score).toBe(0);
    expect(result.details?.connectionStatus).toBe('DISCONNECTED');
  });
});
