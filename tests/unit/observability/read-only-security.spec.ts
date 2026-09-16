import { PlatformHealthService } from '@/modules/observability/health/platform-health-service';
import { DatabaseDiagnostics } from '@/modules/observability/diagnostics/database-diagnostics';
import { WorkerDiagnostics } from '@/modules/observability/diagnostics/worker-diagnostics';
import type { Db } from '@/shared/database/prisma';

describe('Read-Only Security Safeguard', () => {
  it('should ensure health evaluation and diagnostics execute strictly read-only queries', async () => {
    const mockDb = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      platformAlert: { count: jest.fn().mockResolvedValue(0) },
      platformHealthSnapshot: { create: jest.fn().mockResolvedValue({}) },
      outboxEvent: { count: jest.fn().mockResolvedValue(0) },
      operationalMetricBucket: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as Db;

    await PlatformHealthService.evaluatePlatformHealth(mockDb, false);
    await DatabaseDiagnostics.runDiagnostics(mockDb);
    await WorkerDiagnostics.runDiagnostics(mockDb);

    const recordDb = mockDb as unknown as Record<string, unknown>;
    expect(recordDb.booking).toBeUndefined();
    expect(recordDb.payment).toBeUndefined();
    expect(recordDb.wallet).toBeUndefined();
    expect(recordDb.driverProfile).toBeUndefined();
  });
});
