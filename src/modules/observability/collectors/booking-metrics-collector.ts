import { OperationalMetricsRepository } from '../repositories/operational-metrics-repository';
import type { Db } from '@/shared/database/prisma';

export class BookingMetricsCollector {
  static async recordBookingAttempt(status: 'SUCCESS' | 'CANCELLED' | 'FAILED', durationMs: number, db?: Db): Promise<void> {
    await OperationalMetricsRepository.recordMetric(
      {
        metricName: 'booking.attempt',
        dimension: status,
        durationMs,
        isError: status === 'FAILED',
      },
      db
    );
  }
}
