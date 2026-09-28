import { getReliabilityIntelligence } from '@/modules/operations';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    tripReliabilityIncident: {
      count: jest.fn().mockImplementation(({ where }) => {
        if (where?.status?.in) return Promise.resolve(3); // activeIncidents
        if (where?.status === 'RESOLVED') return Promise.resolve(5); // resolvedIncidents
        if (where?.status === 'ESCALATED') return Promise.resolve(1); // escalatedIncidents
        if (where?.status === 'DISMISSED') return Promise.resolve(1); // dismissedIncidents
        return Promise.resolve(10); // totalIncidents
      }),
      findMany: jest.fn().mockResolvedValue([
        {
          type: 'ASSIGNMENT_TIMEOUT',
          detectedAt: new Date('2026-09-28T10:00:00Z'),
          resolvedAt: new Date('2026-09-28T10:05:00Z'), // 5 minutes
        },
        {
          type: 'DRIVER_CANCELLED',
          detectedAt: new Date('2026-09-28T11:00:00Z'),
          resolvedAt: new Date('2026-09-28T11:15:00Z'), // 15 minutes
        },
      ]),
      groupBy: jest.fn().mockResolvedValue([
        { type: 'ASSIGNMENT_TIMEOUT', _count: { id: 6 } },
        { type: 'DRIVER_CANCELLED', _count: { id: 4 } },
      ]),
    },
    tripReliabilityRecoveryAttempt: {
      groupBy: jest.fn().mockImplementation(({ by }) => {
        if (by.includes('failureCode')) {
          return Promise.resolve([
            {
              failureCode: 'DRIVER_UNAVAILABLE',
              _count: { id: 2 },
              _max: { startedAt: new Date('2026-09-28T12:00:00Z') },
            },
          ]);
        }
        return Promise.resolve([
          { status: 'SUCCEEDED', _count: { id: 8 } },
          { status: 'FAILED', _count: { id: 2 } },
        ]);
      }),
    },
    booking: {
      count: jest.fn().mockImplementation(({ where }) => {
        if (where?.status === 'SEARCHING_DRIVER' && where?.createdAt?.lte) {
          return Promise.resolve(2); // delayed
        }
        if (where?.status === 'SEARCHING_DRIVER') return Promise.resolve(6);
        return Promise.resolve(15); // active trips
      }),
    },
    driverProfile: {
      count: jest.fn().mockResolvedValue(4), // available drivers
    },
  },
}));

describe('Phase 83 — Reliability Intelligence Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates total, active, resolved, and escalated incidents correctly', async () => {
    const data = await getReliabilityIntelligence(7);

    expect(data.totalIncidents).toBe(10);
    expect(data.activeIncidents).toBe(3);
    expect(data.resolvedIncidents).toBe(5);
    expect(data.escalatedIncidents).toBe(1);
    expect(data.dismissedIncidents).toBe(1);
  });

  it('calculates recovery success rate accurately from recovery attempt records', async () => {
    const data = await getReliabilityIntelligence(7);

    // 8 SUCCEEDED / 10 total = 80.0%
    expect(data.recoverySuccessRate).toBe(80);
    expect(data.recoveryAttemptsSummary.succeeded).toBe(8);
    expect(data.recoveryAttemptsSummary.failed).toBe(2);
    expect(data.recoveryAttemptsSummary.total).toBe(10);
  });

  it('calculates average incident resolution time in minutes', async () => {
    const data = await getReliabilityIntelligence(7);

    // (5m + 15m) / 2 = 10.0 minutes
    expect(data.avgResolutionTimeMinutes).toBe(10);
  });

  it('identifies top recurring incident patterns with percentage and resolution speed', async () => {
    const data = await getReliabilityIntelligence(7);

    expect(data.recurringIncidents.length).toBe(2);
    expect(data.recurringIncidents[0].type).toBe('ASSIGNMENT_TIMEOUT');
    expect(data.recurringIncidents[0].count).toBe(6);
    expect(data.recurringIncidents[0].percentage).toBe(60);
  });

  it('aggregates failed recovery trends with failure codes and last occurrence timestamp', async () => {
    const data = await getReliabilityIntelligence(7);

    expect(data.failedRecoveryTrends.length).toBe(1);
    expect(data.failedRecoveryTrends[0].failureCode).toBe('DRIVER_UNAVAILABLE');
    expect(data.failedRecoveryTrends[0].count).toBe(2);
    expect(data.failedRecoveryTrends[0].lastOccurredAt).toBeDefined();
  });

  it('computes dispatch pressure metrics including searching bookings and pressure ratio', async () => {
    const data = await getReliabilityIntelligence(7);

    expect(data.dispatchPressure.searchingBookingsCount).toBe(6);
    expect(data.dispatchPressure.delayedBookingsCount).toBe(2);
    expect(data.dispatchPressure.availableDriversCount).toBe(4);
    expect(data.dispatchPressure.pressureRatio).toBe(1.5); // 6 searching / 4 available
  });
});
