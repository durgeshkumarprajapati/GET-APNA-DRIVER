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
 * the change it announces are committed together, or not at all. No worker
 * consumes these events yet; that is introduced when the first asynchronous
 * consumer needs it.
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
