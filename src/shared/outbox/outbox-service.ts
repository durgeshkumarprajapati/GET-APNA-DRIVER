import 'server-only';
import type { Db } from '../database/prisma';

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
}
