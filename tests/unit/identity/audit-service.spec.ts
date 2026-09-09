import { listAuditLogs } from '@/shared/audit/audit-service';

function buildDb(entries: unknown[], total: number) {
  return {
    auditLog: {
      findMany: jest.fn().mockResolvedValue(entries),
      count: jest.fn().mockResolvedValue(total),
    },
  };
}

describe('listAuditLogs', () => {
  it('applies default pagination when none is given', async () => {
    const db = buildDb([{ id: 'log-1' }], 1);

    await listAuditLogs({}, db as never);

    expect(db.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 25, orderBy: { createdAt: 'desc' } }),
    );
  });

  it('caps pageSize at 100 to avoid unbounded queries', async () => {
    const db = buildDb([], 0);

    await listAuditLogs({ pageSize: 5000 }, db as never);

    expect(db.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
  });

  it('builds a where clause from actor, entity, action, and date range filters', async () => {
    const db = buildDb([], 0);
    const fromDate = new Date('2026-01-01T00:00:00Z');
    const toDate = new Date('2026-01-31T23:59:59Z');

    await listAuditLogs(
      {
        actorUserId: 'user-1',
        entityType: 'DriverProfile',
        entityId: 'driver-1',
        action: 'driver.profile.updated',
        fromDate,
        toDate,
      },
      db as never,
    );

    expect(db.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          actorUserId: 'user-1',
          entityType: 'DriverProfile',
          entityId: 'driver-1',
          action: 'driver.profile.updated',
          createdAt: { gte: fromDate, lte: toDate },
        },
      }),
    );
  });

  it('returns entries alongside total/page/pageSize', async () => {
    const db = buildDb([{ id: 'log-1' }, { id: 'log-2' }], 2);

    const result = await listAuditLogs({ page: 2, pageSize: 10 }, db as never);

    expect(result).toEqual({
      entries: [{ id: 'log-1' }, { id: 'log-2' }],
      total: 2,
      page: 2,
      pageSize: 10,
    });
    expect(db.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10 }));
  });
});
