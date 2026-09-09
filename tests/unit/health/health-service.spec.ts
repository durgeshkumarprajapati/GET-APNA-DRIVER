jest.mock('@/shared/database/prisma', () => ({
  prisma: { $queryRaw: jest.fn() },
}));

jest.mock('@/shared/redis/client', () => ({
  redis: { ping: jest.fn() },
}));

import { checkReadiness } from '@/shared/health/health-service';
import { prisma } from '@/shared/database/prisma';
import { redis } from '@/shared/redis/client';

const mockedQueryRaw = prisma.$queryRaw as unknown as jest.Mock;
const mockedPing = redis.ping as jest.Mock;

describe('checkReadiness', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('reports ok when the database and redis are reachable', async () => {
    mockedQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
    mockedPing.mockResolvedValue('PONG');

    const result = await checkReadiness();

    expect(result).toEqual({ status: 'ok', checks: { database: 'ok', redis: 'ok' } });
  });

  it('reports error when the database check fails', async () => {
    mockedQueryRaw.mockRejectedValue(new Error('connection refused'));
    mockedPing.mockResolvedValue('PONG');

    const result = await checkReadiness();

    expect(result.status).toBe('error');
    expect(result.checks.database).toBe('error');
    expect(result.checks.redis).toBe('ok');
  });

  it('reports error when the redis check fails', async () => {
    mockedQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
    mockedPing.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await checkReadiness();

    expect(result.status).toBe('error');
    expect(result.checks.redis).toBe('error');
  });

  it('reports error when redis responds with something other than PONG', async () => {
    mockedQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
    mockedPing.mockResolvedValue('unexpected');

    const result = await checkReadiness();

    expect(result.checks.redis).toBe('error');
  });
});
