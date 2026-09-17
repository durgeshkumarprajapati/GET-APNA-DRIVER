import { PlatformHealthService } from '@/modules/observability/health/platform-health-service';
import { DatabaseHealthService } from '@/modules/observability/health/database-health-service';
import { RedisHealthService } from '@/modules/observability/health/redis-health-service';
import { WorkerHealthService } from '@/modules/observability/health/worker-health-service';
import { ApplicationHealthService } from '@/modules/observability/health/application-health-service';
import { DependencyHealthService } from '@/modules/observability/health/dependency-health-service';
import { HealthSnapshotRepository } from '@/modules/observability/repositories/health-snapshot-repository';
import type { Db } from '@/shared/database/prisma';

jest.mock('@/modules/observability/health/database-health-service');
jest.mock('@/modules/observability/health/redis-health-service');
jest.mock('@/modules/observability/health/worker-health-service');
jest.mock('@/modules/observability/health/application-health-service');
jest.mock('@/modules/observability/health/dependency-health-service');
jest.mock('@/modules/observability/repositories/health-snapshot-repository');

describe('PlatformHealthService', () => {
  const mockDb = {
    platformAlert: {
      count: jest.fn().mockResolvedValue(0),
    },
  } as unknown as Db;

  beforeEach(() => {
    jest.clearAllMocks();
    (DatabaseHealthService.evaluateHealth as jest.Mock).mockResolvedValue({
      name: 'Database',
      category: 'STORAGE',
      status: 'HEALTHY',
      score: 100,
      weight: 0.15,
    });
    (RedisHealthService.evaluateHealth as jest.Mock).mockResolvedValue({
      name: 'Redis',
      category: 'STORAGE',
      status: 'HEALTHY',
      score: 100,
      weight: 0.1,
    });
    (WorkerHealthService.evaluateHealth as jest.Mock).mockResolvedValue({
      name: 'Worker',
      category: 'WORKER',
      status: 'HEALTHY',
      score: 100,
      weight: 0.1,
    });
    (ApplicationHealthService.evaluateHealth as jest.Mock).mockResolvedValue({
      name: 'App',
      category: 'CORE',
      status: 'HEALTHY',
      score: 100,
      weight: 0.15,
    });
    (DependencyHealthService.evaluateHealth as jest.Mock).mockResolvedValue({
      dependencies: [],
      overallStatus: 'HEALTHY',
      score: 100,
    });
    (HealthSnapshotRepository.create as jest.Mock).mockResolvedValue(
      {} as unknown as ReturnType<typeof HealthSnapshotRepository.create>,
    );
  });

  it('should calculate 100 overall score when all components are healthy', async () => {
    const summary = await PlatformHealthService.evaluatePlatformHealth(mockDb, true);

    expect(summary.overallScore).toBe(100);
    expect(summary.overallStatus).toBe('HEALTHY');
    expect(HealthSnapshotRepository.create).toHaveBeenCalled();
  });

  it('should return CRITICAL overall status if any component is CRITICAL', async () => {
    (DatabaseHealthService.evaluateHealth as jest.Mock).mockResolvedValue({
      name: 'Database',
      category: 'STORAGE',
      status: 'CRITICAL',
      score: 0,
      weight: 0.15,
    });

    const summary = await PlatformHealthService.evaluatePlatformHealth(mockDb, false);

    expect(summary.overallStatus).toBe('CRITICAL');
  });
});
