import { OperationalMetricsRepository } from '../repositories/operational-metrics-repository';
import type { Db } from '@/shared/database/prisma';

export class TripReliabilityMetricsCollector {
  static async recordReliabilityIncident(incidentType: string, resolved: boolean, db?: Db): Promise<void> {
    await OperationalMetricsRepository.recordMetric(
      {
        metricName: 'trip_reliability.incident',
        dimension: incidentType,
        durationMs: 0,
        isError: !resolved,
      },
      db
    );
  }
}
