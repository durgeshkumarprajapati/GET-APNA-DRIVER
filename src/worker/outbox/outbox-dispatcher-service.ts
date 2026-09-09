import { OutboxEvent, OutboxEventStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { logger } from '@/shared/logging/logger';
import { eventHandlerRegistry } from './event-handler-registry';
import { getInteger } from '@/shared/config/configuration-service';

export interface OutboxDispatcherOptions {
  workerId?: string;
  batchSize?: number;
  maxAttempts?: number;
  initialRetryDelaySeconds?: number;
  maxRetryDelaySeconds?: number;
  lockTtlSeconds?: number;
}

export class OutboxDispatcherService {
  private workerId: string;

  constructor(workerId?: string) {
    this.workerId = workerId ?? `worker-${process.pid}-${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * Atomically claims eligible outbox events for this worker instance using FOR UPDATE SKIP LOCKED.
   */
  async claimEvents(
    batchSize: number = 50,
    lockTtlSeconds: number = 300,
    db: Db = prisma,
  ): Promise<OutboxEvent[]> {
    const now = new Date();
    const staleLockThreshold = new Date(now.getTime() - lockTtlSeconds * 1000);

    try {
      const claimed = await db.$queryRaw<OutboxEvent[]>`
        WITH eligible AS (
          SELECT id
          FROM outbox_events
          WHERE (status = 'PENDING'::outbox_event_status OR (status = 'PROCESSING'::outbox_event_status AND locked_at < ${staleLockThreshold}))
            AND available_at <= ${now}
          ORDER BY created_at ASC
          LIMIT ${batchSize}
          FOR UPDATE SKIP LOCKED
        )
        UPDATE outbox_events e
        SET status = 'PROCESSING'::outbox_event_status,
            attempts = e.attempts + 1,
            locked_at = ${now},
            locked_by = ${this.workerId},
            last_attempt_at = ${now}
        FROM eligible
        WHERE e.id = eligible.id
        RETURNING e.id,
                  e.event_type AS "eventType",
                  e.aggregate_type AS "aggregateType",
                  e.aggregate_id AS "aggregateId",
                  e.payload,
                  e.status,
                  e.attempts,
                  e.last_error AS "lastError",
                  e.available_at AS "availableAt",
                  e.last_attempt_at AS "lastAttemptAt",
                  e.locked_at AS "lockedAt",
                  e.locked_by AS "lockedBy",
                  e.created_at AS "createdAt",
                  e.processed_at AS "processedAt";
      `;

      if (claimed.length > 0) {
        logger.info(
          { workerId: this.workerId, count: claimed.length },
          'Claimed outbox events batch',
        );
      }

      return claimed;
    } catch (err) {
      logger.error({ workerId: this.workerId, error: err }, 'Error claiming outbox events batch');
      return [];
    }
  }

  /**
   * Processes a single claimed outbox event.
   */
  async processEvent(
    event: OutboxEvent,
    options: OutboxDispatcherOptions = {},
    db: Db = prisma,
  ): Promise<boolean> {
    const maxAttempts =
      options.maxAttempts ?? (await getInteger('notification.outbox.max_attempts', 5, db));
    const initialDelay =
      options.initialRetryDelaySeconds ??
      (await getInteger('notification.outbox.initial_retry_delay_seconds', 10, db));
    const maxDelay =
      options.maxRetryDelaySeconds ??
      (await getInteger('notification.outbox.maximum_retry_delay_seconds', 3600, db));

    const handler = eventHandlerRegistry.getHandler(event.eventType);

    if (!handler) {
      logger.warn(
        { eventId: event.id, eventType: event.eventType },
        'No handler registered for event type; marking as processed to avoid loop',
      );
      await this.markProcessed(event.id, db);
      return true;
    }

    try {
      const payloadObj = (
        typeof event.payload === 'object' && event.payload !== null ? event.payload : {}
      ) as Record<string, unknown>;

      await handler(event, payloadObj, db);

      await this.markProcessed(event.id, db);

      logger.info(
        { eventId: event.id, eventType: event.eventType, attempt: event.attempts },
        'Successfully processed outbox event',
      );
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isFinalAttempt = event.attempts >= maxAttempts;

      logger.error(
        {
          eventId: event.id,
          eventType: event.eventType,
          attempt: event.attempts,
          maxAttempts,
          error: errorMessage,
        },
        isFinalAttempt
          ? 'Outbox event processing failed permanently'
          : 'Outbox event processing failed; scheduling retry',
      );

      if (isFinalAttempt) {
        await this.markFailed(event.id, errorMessage, db);
      } else {
        const delaySeconds = Math.min(
          initialDelay * Math.pow(2, Math.max(0, event.attempts - 1)),
          maxDelay,
        );
        await this.scheduleRetry(event.id, delaySeconds, errorMessage, db);
      }

      return false;
    }
  }

  /**
   * Executes a single polling and processing cycle for this worker.
   */
  async runBatch(options: OutboxDispatcherOptions = {}, db: Db = prisma): Promise<number> {
    const batchSize =
      options.batchSize ?? (await getInteger('notification.outbox.batch_size', 50, db));
    const events = await this.claimEvents(batchSize, options.lockTtlSeconds ?? 300, db);

    let processedCount = 0;
    for (const event of events) {
      const success = await this.processEvent(event, options, db);
      if (success) processedCount++;
    }

    return processedCount;
  }

  private async markProcessed(eventId: string, db: Db): Promise<void> {
    await db.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: OutboxEventStatus.PROCESSED,
        processedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lastError: null,
      },
    });
  }

  private async markFailed(eventId: string, errorMessage: string, db: Db): Promise<void> {
    await db.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: OutboxEventStatus.FAILED,
        lastError: errorMessage,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  private async scheduleRetry(
    eventId: string,
    delaySeconds: number,
    errorMessage: string,
    db: Db,
  ): Promise<void> {
    const availableAt = new Date(Date.now() + delaySeconds * 1000);
    await db.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: OutboxEventStatus.PENDING,
        availableAt,
        lastError: errorMessage,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }
}

export const outboxDispatcherService = new OutboxDispatcherService();
