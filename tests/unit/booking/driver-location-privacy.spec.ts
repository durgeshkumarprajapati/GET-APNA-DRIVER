import { BookingStatus } from '@prisma/client';
import { getDriverLocationForBooking } from '@/modules/booking/application/driver-journey-service';
import { BookingNotFoundError } from '@/modules/booking/domain/errors';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
    },
    driverCurrentLocation: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from '@/shared/database/prisma';

describe('DriverLocationPrivacy', () => {
  const mockFindBooking = prisma.booking.findUnique as jest.Mock;
  const mockFindLocation = prisma.driverCurrentLocation.findUnique as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws BookingNotFoundError if user is not the booking customer owner', async () => {
    mockFindBooking.mockResolvedValue({
      id: 'bk-1',
      customerId: 'cust-owner',
      status: BookingStatus.DRIVER_EN_ROUTE,
      driverProfileId: 'drv-1',
    });

    await expect(getDriverLocationForBooking('other-cust-user', 'bk-1')).rejects.toThrow(
      BookingNotFoundError,
    );
  });

  it('returns null if booking is in non-active tracking state (e.g. DRAFT or COMPLETED)', async () => {
    mockFindBooking.mockResolvedValue({
      id: 'bk-completed',
      customerId: 'cust-owner',
      status: BookingStatus.TRIP_COMPLETED,
      driverProfileId: 'drv-1',
    });

    const result = await getDriverLocationForBooking('cust-owner', 'bk-completed');
    expect(result).toBeNull();
    expect(mockFindLocation).not.toHaveBeenCalled();
  });

  it('returns driver live location snapshot during active state for customer owner', async () => {
    mockFindBooking.mockResolvedValue({
      id: 'bk-active',
      customerId: 'cust-owner',
      status: BookingStatus.TRIP_IN_PROGRESS,
      driverProfileId: 'drv-1',
    });

    const now = new Date();
    mockFindLocation.mockResolvedValue({
      driverProfileId: 'drv-1',
      latitude: 28.6139,
      longitude: 77.209,
      heading: 90,
      speed: 45,
      accuracy: 5,
      capturedAt: now,
    });

    const result = await getDriverLocationForBooking('cust-owner', 'bk-active');

    expect(result).not.toBeNull();
    expect(result?.latitude).toBe(28.6139);
    expect(result?.longitude).toBe(77.209);
    expect(result?.speed).toBe(45);
  });
});
