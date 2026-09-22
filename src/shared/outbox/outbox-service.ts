import 'server-only';
import { prisma, type Db } from '../database/prisma';
import { logger } from '../logging/logger';

import type { Prisma } from '@prisma/client';

export interface InsertOutboxEventInput {
  /** Consistent naming convention: "<aggregate>.<past-tense event>", e.g. "user.created". */
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

/**
 * Inserts a pending outbox event. Must be called with the same transaction
 * client (`tx`) used for the domain change it describes — the outbox row and
 * the change it announces are committed together, or not at all. Consumed by
 * the background worker (`src/worker/index.ts`, run via `npm run worker`),
 * which polls and dispatches to the handlers registered in
 * `src/worker/jobs/notification-event-handlers.ts` — or, for time-sensitive
 * events, by `triggerImmediateOutboxDispatch` right after the enclosing
 * transaction commits (see below).
 */
export async function insertOutboxEvent(db: Db, input: InsertOutboxEventInput): Promise<void> {
  await db.outboxEvent.create({
    data: {
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload as Prisma.InputJsonValue,
    },
  });
}

let handlersRegisteredInThisProcess = false;

/**
 * Registers every outbox event handler exactly once per process (idempotent
 * — `EventHandlerRegistry.register` is a plain `Map.set`, so re-registering
 * is always safe) and runs one processing batch immediately.
 *
 * Call this (awaited) right after a transaction that inserted a
 * time-sensitive outbox event — a new driver offer, a booking acceptance, a
 * driver status change, a captured payment — commits. Without it, that
 * event's notification only gets created whenever the separate `npm run
 * worker` process next polls (every `notification.outbox.poll_interval_
 * seconds`, default 5s, and only if that process is actually running at
 * all — nothing in `next dev`/`next start` starts it). This makes delivery
 * of these specific events correct even when no separate worker process is
 * deployed, while the worker remains the durable catch-all for everything
 * else (scheduled jobs, retries, and every other outbox event).
 *
 * Safe to call concurrently with the real worker and with itself:
 * `outboxDispatcherService.claimEvents` claims rows with `FOR UPDATE SKIP
 * LOCKED`, so two callers racing for the same row simply results in one
 * claiming it and the other finding nothing left to do — never double
 * processing. Never throws — a failure here just means the real worker's
 * next poll picks the event up instead, so this must never be allowed to
 * fail the request that triggered it.
 */
export async function triggerImmediateOutboxDispatch(db: Db = prisma): Promise<void> {
  try {
    if (!handlersRegisteredInThisProcess) {
      const [
        { registerNotificationEventHandlers },
        { registerSafetyAndDisputeEventHandlers },
        { registerSupportEventHandlers },
        { registerCallingEventHandlers },
        { registerDriverEngagementEventHandlers },
      ] = await Promise.all([
        import('@/worker/jobs/notification-event-handlers'),
        import('@/worker/jobs/safety-dispute-event-handlers'),
        import('@/worker/jobs/support-event-handlers'),
        import('@/worker/jobs/calling-event-handlers'),
        import('@/worker/jobs/driver-engagement-event-handlers'),
      ]);
      registerNotificationEventHandlers();
      registerSafetyAndDisputeEventHandlers();
      registerSupportEventHandlers();
      registerCallingEventHandlers();
      registerDriverEngagementEventHandlers();
      handlersRegisteredInThisProcess = true;
    }

    const { outboxDispatcherService } = await import('@/worker/outbox/outbox-dispatcher-service');
    await outboxDispatcherService.runBatch({}, db);
  } catch (err) {
    logger.error(
      { err },
      'Immediate outbox dispatch trigger failed — the background worker will still pick this up on its next poll',
    );
  }
}
