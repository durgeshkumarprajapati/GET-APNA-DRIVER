import { OperationalMetricsRepository } from '../repositories/operational-metrics-repository';
import type { Db } from '@/shared/database/prisma';

export class ApiMetricsCollector {
  static async recordApiCall(
    route: string,
    durationMs: number,
    statusCode: number,
    db?: Db
  ): Promise<void> {
    const isError = statusCode >= 500;
    await OperationalMetricsRepository.recordMetric(
      {
        metricName: 'api.request',
        dimension: route,
        durationMs,
        isError,
        metadata: { statusCode },
      },
      db
    );
  }
}
