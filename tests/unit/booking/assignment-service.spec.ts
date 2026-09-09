import { acceptAssignmentOffer } from '@/modules/booking/application/assignment-service';
import { BookingStatus, AssignmentAttemptStatus, DriverAvailabilityStatus } from '@prisma/client';
import { AssignmentOfferExpiredError } from '@/modules/booking/domain/errors';

const mockTx = {
  bookingAssignmentAttempt: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  booking: {
    update: jest.fn(),
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
}));

jest.mock('@/modules/booking/application/matching-service', () => ({
  findAndOfferNextDriver: jest.fn().mockResolvedValue({ status: 'OFFERED' }),
}));

describe('AssignmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    expect(mockTx.bookingAssignmentAttempt.update).toHaveBeenCalledWith({
      where: { id: 'att-1' },
      data: expect.objectContaining({ status: AssignmentAttemptStatus.ACCEPTED }),
    });

    expect(mockTx.booking.update).toHaveBeenCalledWith({
      where: { id: 'bk-1' },
      data: expect.objectContaining({
        status: BookingStatus.DRIVER_ASSIGNED,
        driverProfileId: 'dp-1',
      }),
    });

    expect(mockTx.driverProfile.update).toHaveBeenCalledWith({
      where: { id: 'dp-1' },
      data: { availabilityStatus: DriverAvailabilityStatus.BUSY },
    });
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
});
