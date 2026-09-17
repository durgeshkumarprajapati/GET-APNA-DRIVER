import { OperationalMetricsRepository } from '../repositories/operational-metrics-repository';
import type { Db } from '@/shared/database/prisma';

export class NotificationMetricsCollector {
  static async recordNotificationSent(
    channel: 'SSE' | 'WEBPUSH' | 'SMS',
    success: boolean,
    db?: Db,
  ): Promise<void> {
    await OperationalMetricsRepository.recordMetric(
      {
        metricName: 'notification.sent',
        dimension: channel,
        durationMs: 0,
        isError: !success,
      },
      db,
    );
  }
}
