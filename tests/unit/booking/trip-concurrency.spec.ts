import { BookingStatus, DriverAvailabilityStatus, DriverOnboardingStatus } from '@prisma/client';
import { startEnRoute, markArrived } from '@/modules/booking/application/driver-journey-service';

const mockTx = {
  booking: {
    update: jest.fn(),
  },
  bookingLog: {
    create: jest.fn(),
  },
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
    booking: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  },
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

jest.mock('@/shared/realtime/realtime-provider', () => ({
  realtime: {
    publishBookingUpdate: jest.fn(),
  },
}));

jest.mock('@/modules/driver/application/services/driver-profile-service', () => ({
  getOrCreateDriverProfile: jest.fn(),
}));

import { prisma } from '@/shared/database/prisma';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';

describe('TripConcurrency', () => {
  const mockGetOrCreateProfile = getOrCreateDriverProfile as jest.Mock;
  const mockFindUniqueBooking = prisma.booking.findUnique as jest.Mock;
  const mockFindUniqueOrThrowBooking = prisma.booking.findUniqueOrThrow as jest.Mock;

  const mockDriverProfile = {
    id: 'drv-prof-1',
    userId: 'user-drv-1',
    onboardingStatus: DriverOnboardingStatus.COMPLETED,
    availabilityStatus: DriverAvailabilityStatus.BUSY,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrCreateProfile.mockResolvedValue(mockDriverProfile);
  });

  it('prevents concurrent double status transition on same booking', async () => {
    mockFindUniqueBooking.mockResolvedValue({
      id: 'bk-conc',
      driverProfileId: 'drv-prof-1',
      status: BookingStatus.DRIVER_ASSIGNED,
    });

    mockFindUniqueOrThrowBooking.mockResolvedValue({
      id: 'bk-conc',
      driverProfileId: 'drv-prof-1',
      status: BookingStatus.DRIVER_EN_ROUTE,
      driverEnRouteAt: new Date(),
    });

    // Execute first action
    const firstCall = startEnRoute('user-drv-1', 'bk-conc');

    // Simulate second action attempting to mark arrived concurrently while state is still assigned or transitioning
    mockFindUniqueBooking.mockResolvedValueOnce({
      id: 'bk-conc',
      driverProfileId: 'drv-prof-1',
      status: BookingStatus.DRIVER_ASSIGNED, // still DRIVER_ASSIGNED in race condition
    });

    const secondCall = markArrived('user-drv-1', 'bk-conc');

    await expect(firstCall).resolves.toBeDefined();
    await expect(secondCall).rejects.toThrow();
  });
});
