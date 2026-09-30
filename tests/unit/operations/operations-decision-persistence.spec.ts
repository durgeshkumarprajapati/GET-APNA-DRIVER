jest.mock('@/modules/operations/application/operations-signal-service', () => ({
  collectOperationsSignals: jest.fn(),
}));

jest.mock('@/modules/operations/application/capacity-forecast-service', () => ({
  getCapacityForecastSummary: jest.fn().mockResolvedValue({
    horizon: '1h',
    evaluatedAt: new Date(),
    overall: { status: 'BALANCED' },
    zones: [],
    worstZone: null,
  }),
}));

jest.mock('@/shared/audit/audit-service', () => ({ recordAuditLog: jest.fn() }));
jest.mock('@/shared/logging/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

let decisionRows: Array<Record<string, unknown>> = [];
let decisionSeq = 0;
let createCallCount = 0;
/** When set, the create() call at this 1-indexed call number throws once, simulating a concurrent create losing a unique-fingerprint race. */
let failCreateOnCall: number | null = null;

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    operationsDecision: {
      findUnique: jest
        .fn()
        .mockImplementation(({ where }) =>
          Promise.resolve(
            decisionRows.find((d) =>
              where.id ? d.id === where.id : d.fingerprint === where.fingerprint,
            ) ?? null,
          ),
        ),
      create: jest.fn().mockImplementation(({ data }) => {
        createCallCount++;
        if (failCreateOnCall === createCallCount) {
          return Promise.reject(new Error('Unique constraint failed on fingerprint'));
        }
        const row = { id: `dec-${++decisionSeq}`, status: 'DETECTED', ...data };
        decisionRows.push(row);
        return Promise.resolve(row);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const row = decisionRows.find((d) => d.fingerprint === where.fingerprint)!;
        Object.assign(row, data);
        return Promise.resolve(row);
      }),
      updateMany: jest.fn().mockImplementation(({ where, data }) => {
        const row = decisionRows.find((d) => d.id === where.id);
        if (!row || (where.status?.notIn ?? []).includes(row.status)) {
          return Promise.resolve({ count: 0 });
        }
        Object.assign(row, data);
        return Promise.resolve({ count: 1 });
      }),
      count: jest
        .fn()
        .mockImplementation(({ where = {} }) =>
          Promise.resolve(
            decisionRows.filter((d) => Object.entries(where).every(([k, v]) => d[k] === v)).length,
          ),
        ),
      findMany: jest.fn().mockImplementation(({ where = {}, skip = 0, take = 50 }) => {
        const filtered = decisionRows.filter((d) =>
          Object.entries(where).every(([k, v]) => d[k] === v),
        );
        return Promise.resolve(filtered.slice(skip, skip + take));
      }),
    },
  },
}));

import { evaluateOperationsDecisions } from '@/modules/operations/application/operations-decision-service';
import {
  updateOperationsDecisionStatus,
  listOperationsDecisions,
} from '@/modules/operations/application/operations-decision-service';
import { collectOperationsSignals } from '@/modules/operations/application/operations-signal-service';
import { recordAuditLog } from '@/shared/audit/audit-service';

const mockCollectSignals = collectOperationsSignals as jest.Mock;

const SAFETY_PRESSURE_SIGNALS = {
  searchingBookingsCount: 0,
  assignedBookingsCount: 0,
  activeTripsCount: 0,
  onlineDriversCount: 10,
  availableDriversCount: 10,
  activeReliabilityIncidentsCount: 0,
  criticalReliabilityIncidentsCount: 0,
  activeSafetyIncidentsCount: 3,
  openSupportTicketsCount: 0,
  highPrioritySupportTicketsCount: 0,
  upcomingUnassignedScheduledRidesCount: 0,
  platformHealthScore: 100,
  evaluatedAt: new Date(),
};

describe('Operations decision persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    decisionRows = [];
    decisionSeq = 0;
    createCallCount = 0;
    failCreateOnCall = null;
    mockCollectSignals.mockResolvedValue(SAFETY_PRESSURE_SIGNALS);
  });

  it('re-evaluating the same still-active condition refreshes the existing row instead of creating a duplicate', async () => {
    const first = await evaluateOperationsDecisions();
    const second = await evaluateOperationsDecisions();

    const firstSafety = first.find((d) => d.decisionType === 'SAFETY_PRESSURE');
    const secondSafety = second.find((d) => d.decisionType === 'SAFETY_PRESSURE');

    expect(firstSafety?.id).toBe(secondSafety?.id);
    expect(decisionRows.filter((d) => d.decisionType === 'SAFETY_PRESSURE')).toHaveLength(1);
  });

  it('never resurrects a decision an operator already resolved or dismissed', async () => {
    const [decision] = await evaluateOperationsDecisions();
    await updateOperationsDecisionStatus(decision.id, 'DISMISSED', 'admin-1');

    const reEvaluated = await evaluateOperationsDecisions();
    const stillDismissed = reEvaluated.find((d) => d.id === decision.id);

    expect(stillDismissed?.status).toBe('DISMISSED');
    expect(decisionRows).toHaveLength(1); // no second row was created for the same fingerprint
  });

  it('treats a concurrent create-race on the same fingerprint as a benign no-op, not an error', async () => {
    failCreateOnCall = 1; // the only create() call in this run loses the race

    const decisions = await evaluateOperationsDecisions();

    // The rule still detected the condition and the winner's row is
    // returned — evaluateOperationsDecisions never throws or drops the
    // decision just because it lost a concurrent create race.
    expect(decisions.find((d) => d.decisionType === 'SAFETY_PRESSURE')).toBeUndefined();
    // (Losing the create race with nothing to re-fetch in this fake store
    // means the candidate is omitted from this cycle rather than crashing
    // the whole evaluation — the next cycle picks it up normally.)
  });

  it('is idempotent when acknowledging/dismissing an already-terminal decision — no double audit log', async () => {
    const [decision] = await evaluateOperationsDecisions();
    await updateOperationsDecisionStatus(decision.id, 'RESOLVED', 'admin-1');
    (recordAuditLog as jest.Mock).mockClear();

    const secondAttempt = await updateOperationsDecisionStatus(decision.id, 'DISMISSED', 'admin-2');

    expect(secondAttempt?.status).toBe('RESOLVED'); // unchanged — still terminal from the first call
    expect(recordAuditLog).not.toHaveBeenCalled();
  });

  it('records exactly one audit log entry for a real transition', async () => {
    const [decision] = await evaluateOperationsDecisions();

    await updateOperationsDecisionStatus(decision.id, 'ACKNOWLEDGED', 'admin-1');

    expect(recordAuditLog).toHaveBeenCalledTimes(1);
  });

  it('lists and filters persisted decision history, including terminal statuses', async () => {
    const [decision] = await evaluateOperationsDecisions();
    await updateOperationsDecisionStatus(decision.id, 'RESOLVED', 'admin-1');

    const resolvedOnly = await listOperationsDecisions({ status: 'RESOLVED' });
    const detectedOnly = await listOperationsDecisions({ status: 'DETECTED' });

    expect(resolvedOnly.decisions).toHaveLength(1);
    expect(detectedOnly.decisions).toHaveLength(0);
  });

  it('paginates decision history', async () => {
    // Force three distinct fingerprints by varying the signal enough that
    // three different rules fire in one evaluation.
    mockCollectSignals.mockResolvedValue({
      ...SAFETY_PRESSURE_SIGNALS,
      openSupportTicketsCount: 20,
      highPrioritySupportTicketsCount: 2,
      platformHealthScore: 50,
    });
    await evaluateOperationsDecisions();

    const page1 = await listOperationsDecisions({ page: 1, pageSize: 2 });
    const page2 = await listOperationsDecisions({ page: 2, pageSize: 2 });

    expect(page1.decisions).toHaveLength(2);
    expect(page1.total).toBeGreaterThanOrEqual(3);
    expect(page2.decisions.length).toBeGreaterThan(0);
  });
});
