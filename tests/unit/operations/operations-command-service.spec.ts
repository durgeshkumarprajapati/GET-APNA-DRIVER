import {
  collectOperationsSignals,
  evaluateOperationsDecisions,
  getOperationsDecisionById,
  updateOperationsDecisionStatus,
  executeOperationsAction,
  getOperationsCommandSummary,
} from '@/modules/operations';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import type { AuthenticatedPrincipal } from '@/modules/identity/domain/types';
import { restartBookingSearch } from '@/modules/booking/application/dispatch-service';

// RESTART_DISPATCH/CANCEL_BOOKING delegate to dispatch-service.ts's own
// permission-checked, state-machine-validated functions (see
// tests/unit/operations/operations-action-service.spec.ts for the
// regression test covering that delegation itself) — mocked here so this
// file stays focused on executeOperationsAction's own orchestration
// (locking, decision-status update, result shape).
jest.mock('@/modules/booking/application/dispatch-service', () => ({
  restartBookingSearch: jest.fn().mockResolvedValue({ id: 'booking-1' }),
  cancelBookingByOperator: jest.fn().mockResolvedValue({ id: 'booking-1' }),
}));

const adminPrincipal: AuthenticatedPrincipal = {
  userId: 'admin-1',
  accountStatus: 'ACTIVE',
  roles: [SYSTEM_ROLE_CODES.ADMINISTRATOR],
  permissions: [PERMISSIONS.DISPATCH_BOOKING_OVERRIDE, PERMISSIONS.BOOKINGS_CANCEL],
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    booking: {
      count: jest.fn().mockImplementation(({ where }) => {
        if (where.status === 'SEARCHING_DRIVER') return Promise.resolve(12);
        if (where.status === 'DRIVER_ASSIGNED') return Promise.resolve(5);
        if (where.status === 'TRIP_IN_PROGRESS') return Promise.resolve(20);
        return Promise.resolve(0);
      }),
      update: jest.fn().mockResolvedValue({ id: 'booking-1', status: 'SEARCHING_DRIVER' }),
    },
    driverProfile: {
      count: jest.fn().mockImplementation(({ where }) => {
        if (where.availabilityStatus?.in) return Promise.resolve(15);
        if (where.availabilityStatus === 'AVAILABLE') return Promise.resolve(4);
        return Promise.resolve(0);
      }),
    },
    tripReliabilityIncident: {
      count: jest.fn().mockResolvedValue(2),
      update: jest.fn().mockResolvedValue({ id: 'inc-1', status: 'RESOLVED' }),
    },
    safetyIncident: {
      count: jest.fn().mockResolvedValue(1),
    },
    supportTicket: {
      count: jest.fn().mockResolvedValue(12),
    },
    scheduledRide: {
      count: jest.fn().mockResolvedValue(1),
    },
  },
}));

jest.mock('@/shared/infrastructure/redis-lock-service', () => ({
  RedisLockService: {
    acquireLock: jest.fn().mockResolvedValue(true),
    releaseLock: jest.fn().mockResolvedValue(true),
  },
}));

describe('Operations Command & Decision Engine Spec', () => {
  it('collectOperationsSignals aggregates real-time domain signals correctly', async () => {
    const signals = await collectOperationsSignals();

    expect(signals.searchingBookingsCount).toBe(12);
    expect(signals.availableDriversCount).toBe(4);
    expect(signals.activeTripsCount).toBe(20);
    expect(signals.activeSafetyIncidentsCount).toBe(1);
    expect(signals.platformHealthScore).toBeLessThanOrEqual(100);
  });

  it('evaluateOperationsDecisions generates deterministic, explainable decision records', async () => {
    const decisions = await evaluateOperationsDecisions();

    expect(decisions.length).toBeGreaterThan(0);
    const safetyDec = decisions.find((d) => d.decisionType === 'SAFETY_PRESSURE');
    expect(safetyDec).toBeDefined();
    expect(safetyDec?.severity).toBe('CRITICAL');
    expect(safetyDec?.recommendedActions.length).toBeGreaterThan(0);

    const shortageDec = decisions.find((d) => d.decisionType === 'DRIVER_SHORTAGE');
    expect(shortageDec).toBeDefined();
    expect(shortageDec?.evidence).toBeDefined();
  });

  it('getOperationsDecisionById retrieves evaluated decision by ID', async () => {
    const decisions = await evaluateOperationsDecisions();
    const firstId = decisions[0].id;

    const retrieved = await getOperationsDecisionById(firstId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(firstId);
  });

  it('updateOperationsDecisionStatus updates decision state to ACKNOWLEDGED', async () => {
    const decisions = await evaluateOperationsDecisions();
    const targetId = decisions[0].id;

    const updated = await updateOperationsDecisionStatus(targetId, 'ACKNOWLEDGED', 'admin-1');
    expect(updated?.status).toBe('ACKNOWLEDGED');
    expect(updated?.acknowledgedBy).toBe('admin-1');
  });

  it('executeOperationsAction executes action with RedisLockService concurrency safety', async () => {
    const decisions = await evaluateOperationsDecisions();
    const decId = decisions[0].id;

    const result = await executeOperationsAction({
      actionId: 'act-1',
      decisionId: decId,
      actionType: 'RESTART_DISPATCH',
      actor: adminPrincipal,
      bookingId: 'booking-1',
    });

    expect(result.success).toBe(true);
    expect(result.actionType).toBe('RESTART_DISPATCH');
    expect(result.message).toContain('booking-1');
    expect(restartBookingSearch).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: 'booking-1', actor: adminPrincipal }),
      expect.anything(),
    );
  });

  it('getOperationsCommandSummary returns top metrics and system status', async () => {
    const summary = await getOperationsCommandSummary();

    expect(summary.activeDecisionsCount).toBeGreaterThan(0);
    expect(summary.systemStatus).toBeDefined();
    expect(summary.decisions.length).toBeGreaterThan(0);
  });
});
