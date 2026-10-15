import { acceptAssignmentOffer } from '@/modules/booking/application/assignment-service';
import { BookingStatus, AssignmentAttemptStatus, DriverAvailabilityStatus } from '@prisma/client';
import {
  AssignmentAlreadyRespondedError,
  AssignmentOfferExpiredError,
  BookingAlreadyAssignedError,
} from '@/modules/booking/domain/errors';
import { triggerImmediateOutboxDispatch } from '@/shared/outbox/outbox-service';

const mockTx = {
  bookingAssignmentAttempt: {
    findUnique: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    findMany: jest.fn().mockResolvedValue([]),
  },
  booking: {
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  driverProfile: {
    update: jest.fn(),
  },
  bookingLog: {
    create: jest.fn(),
  },
  outboxEvent: {
    create: jest.fn(),
  },
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
  },
}));

jest.mock('@/modules/driver/application/services/driver-profile-service', () => ({
  getOrCreateDriverProfile: jest.fn().mockResolvedValue({
    id: 'dp-1',
    userId: 'driver-user-1',
    availabilityStatus: 'AVAILABLE',
  }),
}));

jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  evaluateDriverEligibility: jest.fn().mockResolvedValue({ isEligible: true, reasons: [] }),
}));

jest.mock('@/modules/location/application/driver-location-service', () => ({
  removeDriverFromLiveIndex: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
  triggerImmediateOutboxDispatch: jest.fn(),
}));

jest.mock('@/modules/booking/application/matching-service', () => ({
  findAndOfferNextDriver: jest.fn().mockResolvedValue({ status: 'OFFERED' }),
}));

jest.mock('@/modules/driver/application/services/driver-hire-conflict-service', () => ({
  assertNoDriverHireConflictWithLock: jest.fn().mockResolvedValue(undefined),
}));

describe('AssignmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTx.bookingAssignmentAttempt.updateMany.mockResolvedValue({ count: 1 });
    mockTx.bookingAssignmentAttempt.findMany.mockResolvedValue([]);
    mockTx.booking.updateMany.mockResolvedValue({ count: 1 });
  });

  it('accepts assignment offer atomically, updates driver to BUSY, and evicts from Redis GEO', async () => {
    const mockAttempt = {
      id: 'att-1',
      driverProfileId: 'dp-1',
      status: AssignmentAttemptStatus.PENDING,
      expiresAt: new Date(Date.now() + 30000),
      booking: {
        id: 'bk-1',
        status: BookingStatus.SEARCHING_DRIVER,
      },
    };

    mockTx.bookingAssignmentAttempt.findUnique.mockResolvedValue(mockAttempt);

    await acceptAssignmentOffer('driver-user-1', 'att-1');

    expect(mockTx.bookingAssignmentAttempt.updateMany).toHaveBeenCalledWith({
      where: { id: 'att-1', status: AssignmentAttemptStatus.PENDING },
      data: expect.objectContaining({ status: AssignmentAttemptStatus.ACCEPTED }),
    });

    expect(mockTx.booking.updateMany).toHaveBeenCalledWith({
      where: { id: 'bk-1', status: BookingStatus.SEARCHING_DRIVER },
      data: expect.objectContaining({
        status: BookingStatus.DRIVER_ASSIGNED,
        driverProfileId: 'dp-1',
      }),
    });

    expect(mockTx.driverProfile.update).toHaveBeenCalledWith({
      where: { id: 'dp-1' },
      data: { availabilityStatus: DriverAvailabilityStatus.BUSY },
    });

    // Regression: the customer (and driver) must be notified of the
    // acceptance immediately rather than only whenever the separate
    // background worker next polls.
    expect(triggerImmediateOutboxDispatch).toHaveBeenCalled();
  });

  it('rejects expired offer attempt', async () => {
    const expiredAttempt = {
      id: 'att-expired',
      driverProfileId: 'dp-1',
      status: AssignmentAttemptStatus.PENDING,
      expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
      booking: {
        id: 'bk-1',
        status: BookingStatus.SEARCHING_DRIVER,
      },
    };

    mockTx.bookingAssignmentAttempt.findUnique.mockResolvedValue(expiredAttempt);

    await expect(acceptAssignmentOffer('driver-user-1', 'att-expired')).rejects.toThrow(
      AssignmentOfferExpiredError,
    );
  });

  // Regression: a plain `update` keyed only on `id` (no status in the WHERE)
  // would silently "succeed" even if another transaction had already
  // resolved this exact attempt between this transaction's read and write
  // (e.g. the expiry sweep racing a driver's own accept). The write itself
  // must be the authoritative guard, not just the earlier read.
  it('rejects the accept when another transaction already resolved this attempt between the read and the write', async () => {
    const mockAttempt = {
      id: 'att-1',
      driverProfileId: 'dp-1',
      status: AssignmentAttemptStatus.PENDING,
      expiresAt: new Date(Date.now() + 30000),
      booking: { id: 'bk-1', status: BookingStatus.SEARCHING_DRIVER },
    };
    mockTx.bookingAssignmentAttempt.findUnique.mockResolvedValue(mockAttempt);
    // The conditional WHERE (status: PENDING) no longer matches — something
    // else already flipped this attempt's status before this write landed.
    mockTx.bookingAssignmentAttempt.updateMany.mockResolvedValue({ count: 0 });

    await expect(acceptAssignmentOffer('driver-user-1', 'att-1')).rejects.toThrow(
      AssignmentAlreadyRespondedError,
    );
    expect(mockTx.booking.updateMany).not.toHaveBeenCalled();
  });

  // Regression: two different PENDING attempts for the same booking (which
  // matching-service.ts has no hard DB guarantee against) racing to accept
  // must not both "succeed" — only the first committer's booking write can
  // actually match `status: SEARCHING_DRIVER`.
  it('rejects the accept when the booking was already assigned by a concurrent accept of a different attempt', async () => {
    const mockAttempt = {
      id: 'att-2',
      driverProfileId: 'dp-1',
      status: AssignmentAttemptStatus.PENDING,
      expiresAt: new Date(Date.now() + 30000),
      booking: { id: 'bk-1', status: BookingStatus.SEARCHING_DRIVER },
    };
    mockTx.bookingAssignmentAttempt.findUnique.mockResolvedValue(mockAttempt);
    // This attempt's own row update succeeds (it's a different row from the
    // one the concurrent winner accepted)...
    mockTx.bookingAssignmentAttempt.updateMany.mockResolvedValue({ count: 1 });
    // ...but the booking itself was already flipped to DRIVER_ASSIGNED by
    // that concurrent winner before this write landed.
    mockTx.booking.updateMany.mockResolvedValue({ count: 0 });

    await expect(acceptAssignmentOffer('driver-user-1', 'att-2')).rejects.toThrow(
      BookingAlreadyAssignedError,
    );
    expect(mockTx.driverProfile.update).not.toHaveBeenCalled();
  });
});
