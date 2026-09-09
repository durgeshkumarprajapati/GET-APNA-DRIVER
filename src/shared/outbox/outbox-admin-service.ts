import 'server-only';
import { OutboxEventStatus } from '@prisma/client';
import { prisma, type Db } from '../database/prisma';
import { recordAuditLog } from '../audit/audit-service';

export interface OutboxStats {
  pending: number;
  processing: number;
  processed: number;
  failed: number;
  /** Age in seconds of the oldest PENDING event still waiting to be claimed, or null if none. */
  oldestPendingAgeSeconds: number | null;
  /** Age in seconds of the oldest PROCESSING event, or null if none — a large value flags a possibly-stuck worker. */
  oldestProcessingAgeSeconds: number | null;
}

/**
 * Read-only outbox health snapshot for the admin console. Prior to Phase 17
 * there was no way to answer "how many events are pending/failed" without a
 * direct DB query — this is the first exposed view into it.
 */
export async function getOutboxStats(db: Db = prisma): Promise<OutboxStats> {
  const [pending, processing, processed, failed, oldestPending, oldestProcessing] =
    await Promise.all([
      db.outboxEvent.count({ where: { status: OutboxEventStatus.PENDING } }),
      db.outboxEvent.count({ where: { status: OutboxEventStatus.PROCESSING } }),
      db.outboxEvent.count({ where: { status: OutboxEventStatus.PROCESSED } }),
      db.outboxEvent.count({ where: { status: OutboxEventStatus.FAILED } }),
      db.outboxEvent.findFirst({
        where: { status: OutboxEventStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      db.outboxEvent.findFirst({
        where: { status: OutboxEventStatus.PROCESSING },
        orderBy: { lockedAt: 'asc' },
        select: { lockedAt: true },
      }),
    ]);

  const now = Date.now();
  return {
    pending,
    processing,
    processed,
    failed,
    oldestPendingAgeSeconds: oldestPending
      ? Math.floor((now - oldestPending.createdAt.getTime()) / 1000)
      : null,
    oldestProcessingAgeSeconds: oldestProcessing?.lockedAt
      ? Math.floor((now - oldestProcessing.lockedAt.getTime()) / 1000)
      : null,
  };
}

export interface ListDeadLetterEventsResult {
  events: Array<{
    id: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    attempts: number;
    lastError: string | null;
    createdAt: Date;
  }>;
  total: number;
}

/** FAILED events are terminal with no automatic recovery — this is the admin-visible dead-letter queue. */
export async function listDeadLetterEvents(
  pagination: { page?: number; pageSize?: number } = {},
  db: Db = prisma,
): Promise<ListDeadLetterEventsResult> {
  const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize =
    pagination.pageSize && pagination.pageSize > 0 ? Math.min(pagination.pageSize, 100) : 25;
  const where = { status: OutboxEventStatus.FAILED };

  const [events, total] = await Promise.all([
    db.outboxEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        eventType: true,
        aggregateType: true,
        aggregateId: true,
        attempts: true,
        lastError: true,
        createdAt: true,
      },
    }),
    db.outboxEvent.count({ where }),
  ]);

  return { events, total };
}

export class OutboxEventNotFoundError extends Error {
  constructor(eventId: string) {
    super(`Outbox event not found: ${eventId}`);
    this.name = 'OutboxEventNotFoundError';
  }
}

export class OutboxEventNotDeadLetteredError extends Error {
  constructor(eventId: string) {
    super(`Outbox event ${eventId} is not FAILED; only a dead-lettered event can be requeued.`);
    this.name = 'OutboxEventNotDeadLetteredError';
  }
}

/**
 * Admin-triggered recovery for a dead-lettered (FAILED) event: resets it to
 * PENDING with a fresh attempt budget so the worker picks it up again on
 * its next poll. This is the only path back out of FAILED — the dispatcher
 * itself never automatically retries a FAILED event (see
 * outbox-dispatcher-service.ts). Callers (the API route) are responsible
 * for permission-gating; this only enforces the state transition itself.
 */
export async function requeueDeadLetterEvent(
  eventId: string,
  actorUserId: string,
  db: Db = prisma,
): Promise<void> {
  const event = await db.outboxEvent.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new OutboxEventNotFoundError(eventId);
  }
  if (event.status !== OutboxEventStatus.FAILED) {
    throw new OutboxEventNotDeadLetteredError(eventId);
  }

  await db.outboxEvent.update({
    where: { id: eventId },
    data: {
      status: OutboxEventStatus.PENDING,
      attempts: 0,
      availableAt: new Date(),
      lastError: null,
      lockedAt: null,
      lockedBy: null,
    },
  });

  await recordAuditLog(db, {
    actorUserId,
    action: 'outbox.event.requeued',
    entityType: 'OutboxEvent',
    entityId: eventId,
    beforeState: { status: OutboxEventStatus.FAILED, attempts: event.attempts },
    afterState: { status: OutboxEventStatus.PENDING, attempts: 0 },
  });
}
