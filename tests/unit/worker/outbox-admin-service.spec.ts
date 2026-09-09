import { OutboxEventStatus } from '@prisma/client';
import {
  OutboxEventNotDeadLetteredError,
  OutboxEventNotFoundError,
  getOutboxStats,
  listDeadLetterEvents,
  requeueDeadLetterEvent,
} from '@/shared/outbox/outbox-admin-service';
import { recordAuditLog } from '@/shared/audit/audit-service';

jest.mock('@/shared/database/prisma', () => ({ prisma: {} }));
jest.mock('@/shared/audit/audit-service', () => ({ recordAuditLog: jest.fn() }));

function buildMockDb(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    outboxEvent: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      ...overrides,
    },
  } as never;
}

describe('getOutboxStats', () => {
  it('reports zero/null for an empty outbox', async () => {
    const db = buildMockDb();
    const stats = await getOutboxStats(db);

    expect(stats).toEqual({
      pending: 0,
      processing: 0,
      processed: 0,
      failed: 0,
      oldestPendingAgeSeconds: null,
      oldestProcessingAgeSeconds: null,
    });
  });

  it('computes oldest-pending age from the oldest PENDING row', async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const db = {
      outboxEvent: {
        count: jest
          .fn()
          .mockResolvedValueOnce(3) // pending
          .mockResolvedValueOnce(1) // processing
          .mockResolvedValueOnce(50) // processed
          .mockResolvedValueOnce(2), // failed
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ createdAt: fiveMinutesAgo }) // oldest pending
          .mockResolvedValueOnce(null), // oldest processing
      },
    } as never;

    const stats = await getOutboxStats(db);

    expect(stats.pending).toBe(3);
    expect(stats.failed).toBe(2);
    expect(stats.oldestPendingAgeSeconds).toBeGreaterThanOrEqual(299);
    expect(stats.oldestProcessingAgeSeconds).toBeNull();
  });
});

describe('listDeadLetterEvents', () => {
  it('queries only FAILED events with pagination applied', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const db = { outboxEvent: { findMany, count } } as never;

    await listDeadLetterEvents({ page: 2, pageSize: 10 }, db);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: OutboxEventStatus.FAILED },
        skip: 10,
        take: 10,
      }),
    );
    expect(count).toHaveBeenCalledWith({ where: { status: OutboxEventStatus.FAILED } });
  });
});

describe('requeueDeadLetterEvent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws OutboxEventNotFoundError for a missing event', async () => {
    const db = buildMockDb({ findUnique: jest.fn().mockResolvedValue(null) });
    await expect(requeueDeadLetterEvent('missing', 'admin-1', db)).rejects.toBeInstanceOf(
      OutboxEventNotFoundError,
    );
  });

  it('throws OutboxEventNotDeadLetteredError for a non-FAILED event', async () => {
    const db = buildMockDb({
      findUnique: jest.fn().mockResolvedValue({ id: 'evt-1', status: OutboxEventStatus.PENDING }),
    });
    await expect(requeueDeadLetterEvent('evt-1', 'admin-1', db)).rejects.toBeInstanceOf(
      OutboxEventNotDeadLetteredError,
    );
  });

  it('resets a FAILED event to PENDING with a fresh attempt budget and audits it', async () => {
    const update = jest.fn().mockResolvedValue({});
    const db = buildMockDb({
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'evt-1', status: OutboxEventStatus.FAILED, attempts: 5 }),
      update,
    });

    await requeueDeadLetterEvent('evt-1', 'admin-1', db);

    expect(update).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: expect.objectContaining({
        status: OutboxEventStatus.PENDING,
        attempts: 0,
        lastError: null,
      }),
    });
    expect(recordAuditLog).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ action: 'outbox.event.requeued', actorUserId: 'admin-1' }),
    );
  });
});
