import { OperationalMetricsRepository } from '../repositories/operational-metrics-repository';
import type { Db } from '@/shared/database/prisma';

export class ScheduledRideMetricsCollector {
  static async recordScheduledDispatch(success: boolean, leadTimeMinutes: number, db?: Db): Promise<void> {
    await OperationalMetricsRepository.recordMetric(
      {
        metricName: 'scheduled_ride.dispatch',
        dimension: success ? 'SUCCESS' : 'FAILED',
        durationMs: 0,
        isError: !success,
        metadata: { leadTimeMinutes },
      },
      db
    );
  }
}
