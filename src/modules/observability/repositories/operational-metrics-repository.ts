import { prisma, type Db } from '@/shared/database/prisma';
import type { OperationalMetricBucket, Prisma } from '@prisma/client';

export interface RecordMetricInput {
  metricName: string;
  dimension?: string;
  durationMs?: number;
  isError?: boolean;
  metadata?: Record<string, unknown>;
  bucketStart?: Date;
}

export class OperationalMetricsRepository {
  /**
   * Truncates date to 1-minute bucket start time
   */
  static getBucketStart(date: Date = new Date()): Date {
    const d = new Date(date);
    d.setSeconds(0, 0);
    return d;
  }

  static async recordMetric(input: RecordMetricInput, db: Db = prisma): Promise<OperationalMetricBucket> {
    const bucketStart = input.bucketStart ? this.getBucketStart(input.bucketStart) : this.getBucketStart();
    const dimension = input.dimension ?? 'GLOBAL';
    const durationMs = input.durationMs ?? 0;
    const isError = input.isError ? 1 : 0;

    return db.operationalMetricBucket.upsert({
      where: {
        bucketStart_metricName_dimension: {
          bucketStart,
          metricName: input.metricName,
          dimension,
        },
      },
      create: {
        bucketStart,
        metricName: input.metricName,
        dimension,
        count: 1,
        errorCount: isError,
        totalDurationMs: durationMs,
        minDurationMs: durationMs,
        maxDurationMs: durationMs,
        p50DurationMs: durationMs,
        p95DurationMs: durationMs,
        p99DurationMs: durationMs,
        metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
      },
      update: {
        count: { increment: 1 },
        errorCount: { increment: isError },
        totalDurationMs: { increment: durationMs },
        // Simple running min/max update
        minDurationMs: durationMs > 0 ? durationMs : undefined,
        maxDurationMs: durationMs > 0 ? durationMs : undefined,
      },
    });
  }

  static async getMetricAggregates(
    metricName: string,
    startTime: Date,
    endTime: Date,
    dimension: string = 'GLOBAL',
    db: Db = prisma
  ): Promise<{
    count: number;
    errorCount: number;
    avgDurationMs: number;
    errorRatePercent: number;
    buckets: OperationalMetricBucket[];
  }> {
    const buckets = await db.operationalMetricBucket.findMany({
      where: {
        metricName,
        dimension,
        bucketStart: {
          gte: startTime,
          lte: endTime,
        },
      },
      orderBy: { bucketStart: 'asc' },
    });

    if (buckets.length === 0) {
      return { count: 0, errorCount: 0, avgDurationMs: 0, errorRatePercent: 0, buckets: [] };
    }

    let totalCount = 0;
    let totalErrors = 0;
    let totalDurationSum = 0;

    for (const b of buckets) {
      totalCount += b.count;
      totalErrors += b.errorCount;
      totalDurationSum += b.totalDurationMs;
    }

    const avgDurationMs = totalCount > 0 ? totalDurationSum / totalCount : 0;
    const errorRatePercent = totalCount > 0 ? (totalErrors / totalCount) * 100 : 0;

    return {
      count: totalCount,
      errorCount: totalErrors,
      avgDurationMs: Math.round(avgDurationMs * 100) / 100,
      errorRatePercent: Math.round(errorRatePercent * 100) / 100,
      buckets,
    };
  }

  static async pruneOlderThan(cutoff: Date, db: Db = prisma): Promise<number> {
    const result = await db.operationalMetricBucket.deleteMany({
      where: {
        bucketStart: {
          lt: cutoff,
        },
      },
    });
    return result.count;
  }
}
