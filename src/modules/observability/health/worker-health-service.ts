import { prisma, type Db } from '@/shared/database/prisma';
import { getOutboxStats } from '@/shared/outbox/outbox-admin-service';
import type { HealthComponentScore, PlatformHealthStatus } from '../types/observability-types';
import { HEALTH_COMPONENT_WEIGHTS, TELEMETRY_CONFIG } from '../config/observability-config';

export class WorkerHealthService {
  static async evaluateHealth(db: Db = prisma): Promise<HealthComponentScore> {
    const startTime = Date.now();
    try {
      const stats = await getOutboxStats(db);
      const latencyMs = Date.now() - startTime;

      let status: PlatformHealthStatus = 'HEALTHY';
      let score = 100;

      const oldestPending = stats.oldestPendingAgeSeconds ?? 0;
      const oldestProcessing = stats.oldestProcessingAgeSeconds ?? 0;

      if (stats.failed > 50 || oldestPending > 600 || oldestProcessing > 900) {
        status = 'CRITICAL';
        score = 25;
      } else if (
        stats.failed > 10 ||
        oldestPending > TELEMETRY_CONFIG.outboxOldestPendingThresholdSeconds ||
        stats.pending > TELEMETRY_CONFIG.outboxPendingLagThresholdCount
      ) {
        status = 'WARNING';
        score = 60;
      } else if (stats.failed > 0 || oldestPending > 30 || stats.pending > 30) {
        status = 'DEGRADED';
        score = 80;
      }

      return {
        name: 'Worker & Outbox Pipeline',
        category: 'WORKER',
        status,
        score,
        weight: HEALTH_COMPONENT_WEIGHTS.worker_outbox,
        latencyMs,
        details: {
          pendingCount: stats.pending,
          processingCount: stats.processing,
          processedCount: stats.processed,
          failedCount: stats.failed,
          oldestPendingAgeSeconds: stats.oldestPendingAgeSeconds,
          oldestProcessingAgeSeconds: stats.oldestProcessingAgeSeconds,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        name: 'Worker & Outbox Pipeline',
        category: 'WORKER',
        status: 'CRITICAL',
        score: 0,
        weight: HEALTH_COMPONENT_WEIGHTS.worker_outbox,
        latencyMs,
        details: {
          errorMessage: error instanceof Error ? error.message : 'Worker health query failed',
        },
      };
    }
  }
}
