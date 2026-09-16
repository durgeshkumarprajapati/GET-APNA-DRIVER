import { prisma, type Db } from '@/shared/database/prisma';
import type { HealthComponentScore, PlatformHealthStatus } from '../types/observability-types';
import { HEALTH_COMPONENT_WEIGHTS } from '../config/observability-config';

export class DatabaseHealthService {
  static async evaluateHealth(db: Db = prisma): Promise<HealthComponentScore> {
    const startTime = Date.now();
    try {
      await db.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - startTime;

      let status: PlatformHealthStatus = 'HEALTHY';
      let score = 100;

      if (latencyMs > 2000) {
        status = 'CRITICAL';
        score = 25;
      } else if (latencyMs > 500) {
        status = 'WARNING';
        score = 60;
      } else if (latencyMs > 150) {
        status = 'DEGRADED';
        score = 80;
      }

      return {
        name: 'Database',
        category: 'STORAGE',
        status,
        score,
        weight: HEALTH_COMPONENT_WEIGHTS.database,
        latencyMs,
        details: {
          connectionStatus: 'CONNECTED',
          queryLatencyMs: latencyMs,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        name: 'Database',
        category: 'STORAGE',
        status: 'CRITICAL',
        score: 0,
        weight: HEALTH_COMPONENT_WEIGHTS.database,
        latencyMs,
        details: {
          connectionStatus: 'DISCONNECTED',
          errorMessage: error instanceof Error ? error.message : 'Database ping failed',
        },
      };
    }
  }
}
