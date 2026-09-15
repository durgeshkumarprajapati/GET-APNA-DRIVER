import { OperationalMetricsRepository } from '../repositories/operational-metrics-repository';
import type { Db } from '@/shared/database/prisma';

export class LocationMetricsCollector {
  static async recordLocationUpdate(freshnessSeconds: number, isStale: boolean, db?: Db): Promise<void> {
    await OperationalMetricsRepository.recordMetric(
      {
        metricName: 'location.update',
        dimension: isStale ? 'STALE' : 'FRESH',
        durationMs: freshnessSeconds * 1000,
        isError: isStale,
      },
      db
    );
  }
}
