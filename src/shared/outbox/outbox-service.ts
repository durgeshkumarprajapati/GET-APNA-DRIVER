import 'server-only';
import { prisma, type Db } from '../database/prisma';

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
 * `src/worker/jobs/notification-event-handlers.ts`.
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

  // Immediately schedule inline outbox processing so push/in-app/real-time notifications fire instantly
  setTimeout(() => {
    void dispatchOutboxEventsInline();
  }, 10);
}

/**
 * Triggers an immediate inline processing cycle for pending outbox events.
 * Registers notification handlers and executes outboxDispatcherService.runBatch().
 */
export async function dispatchOutboxEventsInline(db: Db = prisma): Promise<number> {
  try {
    const { registerNotificationEventHandlers } =
      await import('../../worker/jobs/notification-event-handlers');
    registerNotificationEventHandlers();
    const { outboxDispatcherService } =
      await import('../../worker/outbox/outbox-dispatcher-service');
    return await outboxDispatcherService.runBatch({}, db);
  } catch {
    return 0;
  }
}
