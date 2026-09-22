import { executeOperationsAction } from '@/modules/operations/application/operations-action-service';
import {
  restartBookingSearch,
  cancelBookingByOperator,
} from '@/modules/booking/application/dispatch-service';
import { DispatchInvalidBookingStateError } from '@/modules/booking/domain/errors';
import { BookingStatus } from '@prisma/client';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import type { AuthenticatedPrincipal } from '@/modules/identity/domain/types';

/**
 * Regression coverage for the fix to executeOperationsAction's
 * RESTART_DISPATCH/CANCEL_BOOKING branches: they used to write
 * `booking.status` directly with no precondition check at all, so an
 * Operations Command Center click could force ANY booking — including one
 * that was already DRIVER_ASSIGNED, TRIP_IN_PROGRESS, or terminal
 * (COMPLETED/CANCELLED) — back into SEARCHING_DRIVER or into CANCELLED,
 * silently discarding its real state and skipping driver release/audit/
 * outbox side effects. They now delegate to dispatch-service.ts's own
 * permission-checked, state-machine-validated restartBookingSearch /
 * cancelBookingByOperator, so an invalid-state booking is rejected instead
 * of corrupted. This file asserts that delegation and that a rejection from
 * the guarded function propagates instead of being swallowed.
 */

jest.mock('@/modules/booking/application/dispatch-service');

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    tripReliabilityIncident: { update: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock('@/shared/infrastructure/redis-lock-service', () => ({
  RedisLockService: {
    acquireLock: jest.fn().mockResolvedValue(true),
    releaseLock: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('@/modules/operations/application/operations-decision-service', () => ({
  updateOperationsDecisionStatus: jest.fn().mockResolvedValue(null),
}));

const adminPrincipal: AuthenticatedPrincipal = {
  userId: 'admin-1',
  accountStatus: 'ACTIVE',
  roles: [SYSTEM_ROLE_CODES.ADMINISTRATOR],
  permissions: [PERMISSIONS.DISPATCH_BOOKING_OVERRIDE, PERMISSIONS.BOOKINGS_CANCEL],
};

describe('executeOperationsAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RESTART_DISPATCH', () => {
    it('delegates to the guarded restartBookingSearch with the actor and reason', async () => {
      (restartBookingSearch as jest.Mock).mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.SEARCHING_DRIVER,
      });

      const result = await executeOperationsAction({
        actionId: 'act-1',
        decisionId: 'dec-1',
        actionType: 'RESTART_DISPATCH',
        actor: adminPrincipal,
        bookingId: 'booking-1',
        reason: 'manual retry',
      });

      expect(restartBookingSearch).toHaveBeenCalledWith(
        { bookingId: 'booking-1', actor: adminPrincipal, reason: 'manual retry' },
        expect.anything(),
      );
      expect(result.success).toBe(true);
    });

    it('propagates DispatchInvalidBookingStateError instead of forcing the booking back to SEARCHING_DRIVER', async () => {
      (restartBookingSearch as jest.Mock).mockRejectedValue(
        new DispatchInvalidBookingStateError('booking-1', BookingStatus.DRIVER_ASSIGNED, [
          BookingStatus.EXPIRED,
        ]),
      );

      await expect(
        executeOperationsAction({
          actionId: 'act-1',
          decisionId: 'dec-1',
          actionType: 'RESTART_DISPATCH',
          actor: adminPrincipal,
          bookingId: 'booking-1',
        }),
      ).rejects.toThrow(DispatchInvalidBookingStateError);
    });
  });

  describe('CANCEL_BOOKING', () => {
    it('delegates to the guarded cancelBookingByOperator with the actor and reason', async () => {
      (cancelBookingByOperator as jest.Mock).mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.CANCELLED,
      });

      const result = await executeOperationsAction({
        actionId: 'act-2',
        decisionId: 'dec-2',
        actionType: 'CANCEL_BOOKING',
        actor: adminPrincipal,
        bookingId: 'booking-1',
        reason: 'duplicate booking',
      });

      expect(cancelBookingByOperator).toHaveBeenCalledWith(
        { bookingId: 'booking-1', actor: adminPrincipal, reason: 'duplicate booking' },
        expect.anything(),
      );
      expect(result.success).toBe(true);
    });

    it('propagates DispatchInvalidBookingStateError instead of cancelling an already-terminal booking', async () => {
      (cancelBookingByOperator as jest.Mock).mockRejectedValue(
        new DispatchInvalidBookingStateError('booking-1', BookingStatus.TRIP_COMPLETED, [
          BookingStatus.DRAFT,
          BookingStatus.SEARCHING_DRIVER,
        ]),
      );

      await expect(
        executeOperationsAction({
          actionId: 'act-2',
          decisionId: 'dec-2',
          actionType: 'CANCEL_BOOKING',
          actor: adminPrincipal,
          bookingId: 'booking-1',
        }),
      ).rejects.toThrow(DispatchInvalidBookingStateError);
    });
  });
});
