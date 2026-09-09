import 'server-only';
import { prisma } from '../database/prisma';
import { redis } from '../redis/client';
import { logger } from '../logging/logger';

export type CheckStatus = 'ok' | 'error';

export interface ReadinessResult {
  status: CheckStatus;
  checks: {
    database: CheckStatus;
    redis: CheckStatus;
  };
}

export async function checkReadiness(): Promise<ReadinessResult> {
  const [database, redisStatus] = await Promise.all([checkDatabase(), checkRedis()]);
  const status: CheckStatus = database === 'ok' && redisStatus === 'ok' ? 'ok' : 'error';
  return { status, checks: { database, redis: redisStatus } };
}

async function checkDatabase(): Promise<CheckStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'ok';
  } catch (error) {
    logger.error({ err: error }, 'Database readiness check failed');
    return 'error';
  }
}

async function checkRedis(): Promise<CheckStatus> {
  try {
    const result = await redis.ping();
    return result === 'PONG' ? 'ok' : 'error';
  } catch (error) {
    logger.error({ err: error }, 'Redis readiness check failed');
    return 'error';
  }
}
