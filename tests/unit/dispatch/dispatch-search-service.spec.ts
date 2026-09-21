import type { Db } from '@/shared/database/prisma';
import {
  cancelBookingNoDriverFound,
  getDispatchSearchState,
  CANCELLATION_REASON_NO_DRIVER,
  SEARCH_DEADLINE_SECONDS,
} from '@/modules/dispatch/application/dispatch-search-service';

describe('Phase 55 — Dispatch Search Service Unit Tests', () => {
  const mockBookingId = 'booking-123';

  it('calculates 180-second server search deadline correctly', async () => {
    const searchStartedAt = new Date();
    const mockDb = {
      booking: {
        findUnique: jest.fn().mockResolvedValue({
          id: mockBookingId,
          status: 'SEARCHING_DRIVER',
          searchStartedAt,
          createdAt: searchStartedAt,
          expiresAt: null,
        }),
      },
    } as unknown as Db;

    const state = await getDispatchSearchState(mockBookingId, mockDb);
    expect(state).not.toBeNull();
    expect(state?.bookingId).toBe(mockBookingId);
    expect(state?.remainingSeconds).toBeGreaterThan(0);
    expect(state?.remainingSeconds).toBeLessThanOrEqual(SEARCH_DEADLINE_SECONDS);
  });

  it('executes server-authoritative no-driver cancellation with NO_ACTIVE_DRIVER_NEARBY reason', async () => {
    const mockTx = {
      booking: {
        update: jest.fn().mockResolvedValue({ id: mockBookingId, status: 'CANCELLED' }),
      },
      bookingAssignmentAttempt: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      bookingLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
      outboxEvent: {
        create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
      },
    };

    const mockDb = {
      booking: {
        findUnique: jest.fn().mockResolvedValue({
          id: mockBookingId,
          customerId: 'cust-1',
          status: 'SEARCHING_DRIVER',
          driverProfileId: null,
          assignmentAttempts: [],
        }),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    } as unknown as Db;

    const result = await cancelBookingNoDriverFound(mockBookingId, mockDb);

    expect(result.cancelled).toBe(true);
    expect(result.reason).toBe(CANCELLATION_REASON_NO_DRIVER);
    expect(mockTx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockBookingId },
        data: expect.objectContaining({
          status: 'CANCELLED',
          cancellationReason: CANCELLATION_REASON_NO_DRIVER,
        }),
      }),
    );
  });
});
