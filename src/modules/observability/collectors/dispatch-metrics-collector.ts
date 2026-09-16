import { OperationalMetricsRepository } from '../repositories/operational-metrics-repository';
import type { Db } from '@/shared/database/prisma';

export class DispatchMetricsCollector {
  static async recordDispatchMatch(
    matched: boolean,
    matchDurationMs: number,
    db?: Db,
  ): Promise<void> {
    await OperationalMetricsRepository.recordMetric(
      {
        metricName: 'dispatch.match',
        dimension: matched ? 'MATCHED' : 'UNMATCHED',
        durationMs: matchDurationMs,
        isError: !matched,
      },
      db,
    );
  }
}
