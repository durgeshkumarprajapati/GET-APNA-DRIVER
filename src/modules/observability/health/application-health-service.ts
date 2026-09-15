import { prisma, type Db } from '@/shared/database/prisma';
import { OperationalMetricsRepository } from '../repositories/operational-metrics-repository';
import type { HealthComponentScore, PlatformHealthStatus } from '../types/observability-types';
import { HEALTH_COMPONENT_WEIGHTS } from '../config/observability-config';

export class ApplicationHealthService {
  static async evaluateHealth(db: Db = prisma): Promise<HealthComponentScore> {
    const startTime = Date.now();
    try {
      const now = new Date();
      const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);

      const metrics = await OperationalMetricsRepository.getMetricAggregates(
        'api.request',
        fifteenMinsAgo,
        now,
        'GLOBAL',
        db
      );

      const latencyMs = Date.now() - startTime;
      let status: PlatformHealthStatus = 'HEALTHY';
      let score = 100;

      if (metrics.count > 0) {
        if (metrics.errorRatePercent > 10.0 || metrics.avgDurationMs > 2000) {
          status = 'CRITICAL';
          score = 30;
        } else if (metrics.errorRatePercent > 3.0 || metrics.avgDurationMs > 800) {
          status = 'WARNING';
          score = 65;
        } else if (metrics.errorRatePercent > 1.0 || metrics.avgDurationMs > 300) {
          status = 'DEGRADED';
          score = 85;
        }
      }

      return {
        name: 'Application API & Web',
        category: 'CORE',
        status,
        score,
        weight: HEALTH_COMPONENT_WEIGHTS.app_availability,
        latencyMs,
        errorRatePercent: metrics.errorRatePercent,
        details: {
          requestCount15m: metrics.count,
          errorCount15m: metrics.errorCount,
          errorRatePercent: metrics.errorRatePercent,
          avgResponseTimeMs: metrics.avgDurationMs,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        name: 'Application API & Web',
        category: 'CORE',
        status: 'UNKNOWN',
        score: 75,
        weight: HEALTH_COMPONENT_WEIGHTS.app_availability,
        latencyMs,
        details: {
          errorMessage: error instanceof Error ? error.message : 'App health evaluation failed',
        },
      };
    }
  }
}
