import type { runOperationsExecutionReconciliation as RunReconciliationType } from '@/worker/jobs/operations-execution-reconciliation-job';

const mockAcquireLock = jest.fn().mockResolvedValue(true);
const mockReleaseLock = jest.fn().mockResolvedValue(true);
const mockGetBoolean = jest.fn().mockResolvedValue(true);
const mockGetInteger = jest.fn();

jest.mock('@/shared/infrastructure/redis-lock-service', () => ({
  RedisLockService: {
    acquireLock: mockAcquireLock,
    releaseLock: mockReleaseLock,
  },
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getBoolean: mockGetBoolean,
  getInteger: mockGetInteger,
}));

jest.mock('@/shared/logging/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

function defaultGetInteger(key: string): Promise<number> {
  if (key === 'operations.reconciliation.interval_seconds') return Promise.resolve(0);
  if (key === 'operations.reconciliation.stale_threshold_seconds') return Promise.resolve(600);
  if (key === 'operations.reconciliation.batch_size') return Promise.resolve(100);
  return Promise.resolve(0);
}

function buildMockDb(stuck: Array<{ id: string; decisionId: string }>) {
  return {
    operationsDecisionExecution: {
      findMany: jest.fn().mockResolvedValue(stuck),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('runOperationsExecutionReconciliation', () => {
  let runOperationsExecutionReconciliation: typeof RunReconciliationType;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockAcquireLock.mockResolvedValue(true);
    mockReleaseLock.mockResolvedValue(true);
    mockGetBoolean.mockResolvedValue(true);
    mockGetInteger.mockImplementation(defaultGetInteger);
    /* eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic re-require after jest.resetModules() */
    const mod = require('@/worker/jobs/operations-execution-reconciliation-job');
    runOperationsExecutionReconciliation = mod.runOperationsExecutionReconciliation;
  });

  it('marks stuck PROCESSING executions FAILED with a reconciliation failure code', async () => {
    const db = buildMockDb([{ id: 'exec-1', decisionId: 'dec-1' }]);

    const result = await runOperationsExecutionReconciliation(db);

    expect(result.skipped).toBe(false);
    expect(result.reconciledCount).toBe(1);
    expect(db.operationsDecisionExecution.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'exec-1', status: 'PROCESSING' },
        data: expect.objectContaining({ status: 'FAILED', failureCode: 'INTERRUPTED_EXECUTION' }),
      }),
    );
  });

  it('reconciles nothing when no execution is stuck', async () => {
    const db = buildMockDb([]);

    const result = await runOperationsExecutionReconciliation(db);

    expect(result.skipped).toBe(false);
    expect(result.reconciledCount).toBe(0);
  });

  it('skips entirely when reconciliation is disabled via config', async () => {
    mockGetBoolean.mockResolvedValue(false);
    const db = buildMockDb([{ id: 'exec-1', decisionId: 'dec-1' }]);

    const result = await runOperationsExecutionReconciliation(db);

    expect(result.skipped).toBe(true);
    expect(mockAcquireLock).not.toHaveBeenCalled();
  });

  it('skips when the Redis lock is already held by another worker', async () => {
    mockAcquireLock.mockResolvedValue(false);
    const db = buildMockDb([{ id: 'exec-1', decisionId: 'dec-1' }]);

    const result = await runOperationsExecutionReconciliation(db);

    expect(result.skipped).toBe(true);
    expect(db.operationsDecisionExecution.findMany).not.toHaveBeenCalled();
  });

  it('continues the batch when one row fails to reconcile', async () => {
    const db = buildMockDb([
      { id: 'exec-bad', decisionId: 'dec-1' },
      { id: 'exec-good', decisionId: 'dec-2' },
    ]);
    db.operationsDecisionExecution.updateMany = jest
      .fn()
      .mockRejectedValueOnce(new Error('db blip'))
      .mockResolvedValueOnce({ count: 1 });

    const result = await runOperationsExecutionReconciliation(db);

    expect(result.reconciledCount).toBe(1);
  });

  it('self-gates on the configured interval, skipping a second call issued immediately after the first', async () => {
    mockGetInteger.mockImplementation((key: string) => {
      if (key === 'operations.reconciliation.interval_seconds') return Promise.resolve(3600);
      return defaultGetInteger(key);
    });
    const db = buildMockDb([]);

    const first = await runOperationsExecutionReconciliation(db);
    const second = await runOperationsExecutionReconciliation(db);

    expect(first.skipped).toBe(false);
    expect(second.skipped).toBe(true);
    expect(mockAcquireLock).toHaveBeenCalledTimes(1);
  });
});
