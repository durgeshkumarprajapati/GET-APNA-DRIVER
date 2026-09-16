import { redis } from '@/shared/redis/client';
import type { HealthComponentScore, PlatformHealthStatus } from '../types/observability-types';
import { HEALTH_COMPONENT_WEIGHTS } from '../config/observability-config';

export class RedisHealthService {
  static async evaluateHealth(): Promise<HealthComponentScore> {
    const startTime = Date.now();
    try {
      const pong = await redis.ping();
      const latencyMs = Date.now() - startTime;

      let status: PlatformHealthStatus = 'HEALTHY';
      let score = 100;

      if (pong !== 'PONG') {
        status = 'CRITICAL';
        score = 0;
      } else if (latencyMs > 1000) {
        status = 'CRITICAL';
        score = 25;
      } else if (latencyMs > 250) {
        status = 'WARNING';
        score = 60;
      } else if (latencyMs > 50) {
        status = 'DEGRADED';
        score = 80;
      }

      return {
        name: 'Redis Cache & Queue',
        category: 'STORAGE',
        status,
        score,
        weight: HEALTH_COMPONENT_WEIGHTS.redis,
        latencyMs,
        details: {
          pingResponse: pong,
          pingLatencyMs: latencyMs,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        name: 'Redis Cache & Queue',
        category: 'STORAGE',
        status: 'CRITICAL',
        score: 0,
        weight: HEALTH_COMPONENT_WEIGHTS.redis,
        latencyMs,
        details: {
          connectionStatus: 'DISCONNECTED',
          errorMessage: error instanceof Error ? error.message : 'Redis ping failed',
        },
      };
    }
  }
}
