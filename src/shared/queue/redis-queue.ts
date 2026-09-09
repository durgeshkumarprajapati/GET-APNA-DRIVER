import 'server-only';
import { redis } from '../redis/client';
import { logger } from '../logging/logger';

export interface Job<T = Record<string, unknown>> {
  id: string;
  queueName: string;
  payload: T;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  runAt: string;
}

export class RedisQueue {
  private queueKey(queueName: string): string {
    return `queue:${queueName}`;
  }

  private delayedKey(queueName: string): string {
    return `queue:${queueName}:delayed`;
  }

  /**
   * Enqueues a job for immediate or delayed processing.
   */
  async enqueue<T>(
    queueName: string,
    jobId: string,
    payload: T,
    options: { delayMs?: number; maxAttempts?: number } = {},
  ): Promise<void> {
    const now = Date.now();
    const runAtTime = now + (options.delayMs ?? 0);

    const job: Job<T> = {
      id: jobId,
      queueName,
      payload,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? 5,
      createdAt: new Date(now).toISOString(),
      runAt: new Date(runAtTime).toISOString(),
    };

    const serialized = JSON.stringify(job);

    try {
      if (options.delayMs && options.delayMs > 0) {
        await redis.zadd(this.delayedKey(queueName), runAtTime, serialized);
        logger.debug({ queueName, jobId, delayMs: options.delayMs }, 'Enqueued delayed job');
      } else {
        await redis.rpush(this.queueKey(queueName), serialized);
        logger.debug({ queueName, jobId }, 'Enqueued immediate job');
      }
    } catch (err) {
      logger.error({ queueName, jobId, error: err }, 'Failed to enqueue job to Redis queue');
    }
  }

  /**
   * Moves due delayed jobs into the main queue for processing.
   */
  async promoteDelayed(queueName: string): Promise<number> {
    const now = Date.now();
    const delayedKey = this.delayedKey(queueName);
    const queueKey = this.queueKey(queueName);

    try {
      // Get due jobs
      const dueJobs = await redis.zrangebyscore(delayedKey, 0, now);
      if (dueJobs.length === 0) return 0;

      const pipeline = redis.pipeline();
      for (const jobStr of dueJobs) {
        pipeline.zrem(delayedKey, jobStr);
        pipeline.rpush(queueKey, jobStr);
      }
      await pipeline.exec();

      logger.debug({ queueName, count: dueJobs.length }, 'Promoted due delayed jobs');
      return dueJobs.length;
    } catch (err) {
      logger.error({ queueName, error: err }, 'Failed to promote delayed jobs');
      return 0;
    }
  }

  /**
   * Pops a single job from the queue.
   */
  async dequeue<T>(queueName: string): Promise<Job<T> | null> {
    try {
      await this.promoteDelayed(queueName);
      const raw = await redis.lpop(this.queueKey(queueName));
      if (!raw) return null;
      return JSON.parse(raw) as Job<T>;
    } catch (err) {
      logger.error({ queueName, error: err }, 'Failed to dequeue job');
      return null;
    }
  }
}

export const queue = new RedisQueue();
