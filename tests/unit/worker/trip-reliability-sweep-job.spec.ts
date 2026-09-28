import type { runTripReliabilitySweep as RunTripReliabilitySweepType } from '@/worker/jobs/trip-reliability-sweep-job';
import type { Db } from '@/shared/database/prisma';

const mockAssembleContext = jest.fn();
const mockEvaluateBookingReliability = jest.fn();
const mockExecuteRecovery = jest.fn();
const mockAcquireLock = jest.fn().mockResolvedValue(true);
const mockReleaseLock = jest.fn().mockResolvedValue(true);
const mockGetBoolean = jest.fn().mockResolvedValue(true);
const mockGetInteger = jest.fn().mockImplementation((key: string) => {
  if (key === 'trip_reliability.sweep_interval_seconds') return Promise.resolve(0);
  if (key === 'trip_reliability.sweep_batch_size') return Promise.resolve(200);
  return Promise.resolve(0);
});

jest.mock('@/modules/trip-reliability/incident-context-service', () => ({
  IncidentContextService: jest.fn().mockImplementation(() => ({
    assembleContext: mockAssembleContext,
  })),
}));

jest.mock('@/modules/trip-reliability/incident-detection-service', () => ({
  IncidentDetectionService: jest.fn().mockImplementation(() => ({
    evaluateBookingReliability: mockEvaluateBookingReliability,
  })),
}));

jest.mock('@/modules/trip-reliability/incident-recovery-service', () => ({
  IncidentRecoveryService: jest.fn().mockImplementation(() => ({
    executeRecovery: mockExecuteRecovery,
  })),
}));

const mockGetTripReliabilityConfig = jest.fn();

jest.mock('@/modules/trip-reliability/trip-reliability-config', () => ({
  getTripReliabilityConfig: mockGetTripReliabilityConfig,
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getBoolean: mockGetBoolean,
  getInteger: mockGetInteger,
}));

jest.mock('@/shared/infrastructure/redis-lock-service', () => ({
  RedisLockService: {
    acquireLock: mockAcquireLock,
    releaseLock: mockReleaseLock,
  },
}));

jest.mock('@/shared/database/prisma', () => ({ prisma: {} }));
jest.mock('@/shared/logging/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

function buildMockDb(bookings: Array<{ id: string }>) {
  return {
    booking: {
      findMany: jest.fn().mockResolvedValue(bookings),
    },
    safetyIncident: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  } as unknown as Db;
}

describe('runTripReliabilitySweep', () => {
  let runTripReliabilitySweep: typeof RunTripReliabilitySweepType;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockAcquireLock.mockResolvedValue(true);
    mockReleaseLock.mockResolvedValue(true);
    mockGetBoolean.mockResolvedValue(true);
    mockGetInteger.mockImplementation((key: string) => {
      if (key === 'trip_reliability.sweep_interval_seconds') return Promise.resolve(0);
      if (key === 'trip_reliability.sweep_batch_size') return Promise.resolve(200);
      return Promise.resolve(0);
    });
    mockGetTripReliabilityConfig.mockReturnValue({
      enabled: true,
      customerEnabled: true,
      driverEnabled: true,
      adminEnabled: true,
      assignmentTimeoutSeconds: 300,
      locationStaleSeconds: 120,
      pickupDelaySeconds: 600,
      stuckTripMinutes: 30,
      dispatchRetryLimit: 3,
      recoveryLockTtlSeconds: 30,
      incidentCooldownSeconds: 60,
    });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ({ runTripReliabilitySweep } = require('@/worker/jobs/trip-reliability-sweep-job'));
  });

  it('scans active bookings and reports zero incidents when nothing is detected', async () => {
    mockAssembleContext.mockResolvedValue({
      booking: {
        status: 'DRIVER_EN_ROUTE',
        customerId: 'cust_1',
        driverProfileId: 'drv_1',
        driverProfile: { userId: 'drv_user_1' },
        createdAt: new Date(),
        updatedAt: new Date(),
        driverEnRouteAt: new Date(),
        driverArrivedAt: null,
        tripStartedAt: null,
        tripCompletedAt: null,
        pickupLatitude: 1,
        pickupLongitude: 1,
        finalFareAmount: null,
      },
      telemetry: null,
      paymentState: { paymentCaptured: false, hasTaxInvoice: false },
    });
    mockEvaluateBookingReliability.mockResolvedValue(null);

    const db = buildMockDb([{ id: 'b1' }]);
    const result = await runTripReliabilitySweep(db);

    expect(result.skipped).toBe(false);
    expect(result.scanned).toBe(1);
    expect(result.incidentsDetected).toBe(0);
    expect(result.recoveriesAttempted).toBe(0);
    expect(mockExecuteRecovery).not.toHaveBeenCalled();
    expect(mockAcquireLock).toHaveBeenCalled();
    expect(mockReleaseLock).toHaveBeenCalled();
  });

  it('triggers recovery for a newly-detected incident but not for one already past DETECTED', async () => {
    mockAssembleContext.mockResolvedValue({
      booking: {
        status: 'SEARCHING_DRIVER',
        customerId: 'cust_1',
        driverProfileId: null,
        driverProfile: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        driverEnRouteAt: null,
        driverArrivedAt: null,
        tripStartedAt: null,
        tripCompletedAt: null,
        pickupLatitude: 1,
        pickupLongitude: 1,
        finalFareAmount: null,
      },
      telemetry: null,
      paymentState: { paymentCaptured: false, hasTaxInvoice: false },
    });
    mockEvaluateBookingReliability
      .mockResolvedValueOnce({ id: 'inc_1', status: 'DETECTED', type: 'ASSIGNMENT_TIMEOUT' })
      .mockResolvedValueOnce({ id: 'inc_2', status: 'RECOVERING', type: 'ASSIGNMENT_TIMEOUT' });

    const db = buildMockDb([{ id: 'b1' }, { id: 'b2' }]);
    const result = await runTripReliabilitySweep(db);

    expect(result.incidentsDetected).toBe(2);
    expect(result.recoveriesAttempted).toBe(1);
    expect(mockExecuteRecovery).toHaveBeenCalledTimes(1);
    expect(mockExecuteRecovery).toHaveBeenCalledWith('inc_1', null);
  });

  it('continues the batch when one booking throws during evaluation', async () => {
    mockAssembleContext.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({
      booking: {
        status: 'TRIP_IN_PROGRESS',
        customerId: 'cust_2',
        driverProfileId: 'drv_2',
        driverProfile: { userId: 'drv_user_2' },
        createdAt: new Date(),
        updatedAt: new Date(),
        driverEnRouteAt: new Date(),
        driverArrivedAt: new Date(),
        tripStartedAt: new Date(),
        tripCompletedAt: null,
        pickupLatitude: 1,
        pickupLongitude: 1,
        finalFareAmount: null,
      },
      telemetry: null,
      paymentState: { paymentCaptured: true, hasTaxInvoice: false },
    });
    mockEvaluateBookingReliability.mockResolvedValue(null);

    const db = buildMockDb([{ id: 'b_bad' }, { id: 'b_good' }]);
    const result = await runTripReliabilitySweep(db);

    expect(result.scanned).toBe(2);
    expect(result.incidentsDetected).toBe(0);
  });

  it('skips the sweep entirely when trip reliability is globally disabled', async () => {
    mockGetTripReliabilityConfig.mockReturnValue({ enabled: false });

    const db = buildMockDb([{ id: 'b1' }]);
    const result = await runTripReliabilitySweep(db);

    expect(result.skipped).toBe(true);
    expect(result.scanned).toBe(0);
    expect(mockAcquireLock).not.toHaveBeenCalled();
  });

  it('skips when the Redis lock is already held by another worker', async () => {
    mockAcquireLock.mockResolvedValue(false);

    const db = buildMockDb([{ id: 'b1' }]);
    const result = await runTripReliabilitySweep(db);

    expect(result.skipped).toBe(true);
    expect(db.booking.findMany).not.toHaveBeenCalled();
  });

  it('self-gates on the configured interval, skipping a second call issued immediately after the first', async () => {
    mockGetInteger.mockImplementation((key: string) => {
      if (key === 'trip_reliability.sweep_interval_seconds') return Promise.resolve(3600);
      if (key === 'trip_reliability.sweep_batch_size') return Promise.resolve(200);
      return Promise.resolve(0);
    });
    mockAssembleContext.mockResolvedValue(null);

    const db = buildMockDb([]);
    const first = await runTripReliabilitySweep(db);
    const second = await runTripReliabilitySweep(db);

    expect(first.skipped).toBe(false);
    expect(second.skipped).toBe(true);
    expect(mockAcquireLock).toHaveBeenCalledTimes(1);
  });
});
