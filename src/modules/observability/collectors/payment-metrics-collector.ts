import { OperationalMetricsRepository } from '../repositories/operational-metrics-repository';
import type { Db } from '@/shared/database/prisma';

export class PaymentMetricsCollector {
  static async recordPaymentTransaction(status: 'COMPLETED' | 'FAILED' | 'PENDING', amount: number, db?: Db): Promise<void> {
    await OperationalMetricsRepository.recordMetric(
      {
        metricName: 'payment.transaction',
        dimension: status,
        durationMs: 0,
        isError: status === 'FAILED',
        metadata: { amount },
      },
      db
    );
  }
}
