import { prisma, type Db } from '@/shared/database/prisma';
import { SLO_DEFINITIONS, type SloDefinition } from '../config/slo-config';
import type { ServiceSloReport } from '../types/observability-types';
import { OperationalMetricsRepository } from '../repositories/operational-metrics-repository';

export class SloService {
  static async evaluateAllSlos(db: Db = prisma): Promise<ServiceSloReport[]> {
    const reports: ServiceSloReport[] = [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const slo of SLO_DEFINITIONS) {
      const report = await this.evaluateSlo(slo, oneDayAgo, now, db);
      reports.push(report);
    }

    return reports;
  }

  static async evaluateSlo(
    slo: SloDefinition,
    startTime: Date,
    endTime: Date,
    db: Db = prisma
  ): Promise<ServiceSloReport> {
    const metrics = await OperationalMetricsRepository.getMetricAggregates(
      slo.metricName,
      startTime,
      endTime,
      'GLOBAL',
      db
    );

    let actualPercent = 100.0;
    if (metrics.count > 0) {
      actualPercent = Math.max(0, 100.0 - metrics.errorRatePercent);
    }

    const isCompliant = actualPercent >= slo.targetPercent;
    // Error budget calculation: 100 - target
    const totalAllowedErrorPercent = 100.0 - slo.targetPercent; // e.g. 0.1% for 99.9%
    const currentErrorPercent = 100.0 - actualPercent;
    const errorBudgetRemainingPercent = totalAllowedErrorPercent > 0
      ? Math.max(0, Math.min(100, ((totalAllowedErrorPercent - currentErrorPercent) / totalAllowedErrorPercent) * 100))
      : 100;

    return {
      serviceName: slo.serviceName,
      sliName: slo.description,
      targetPercent: slo.targetPercent,
      actualPercent: Math.round(actualPercent * 100) / 100,
      isCompliant,
      errorBudgetRemainingPercent: Math.round(errorBudgetRemainingPercent * 10) / 10,
      timeframe: slo.timeWindow,
    };
  }
}
