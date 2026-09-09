import { BookingStatus, DriverAvailabilityStatus, DriverOnboardingStatus } from '@prisma/client';
import {
  startEnRoute,
  markArrived,
  startTrip,
  completeTrip,
  listDriverBookings,
} from '@/modules/booking/application/driver-journey-service';

const mockTx = {
  booking: {
    update: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  bookingLog: {
    create: jest.fn(),
  },
  driverProfile: {
    update: jest.fn(),
  },
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
    driverProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
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

jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  evaluateDriverEligibility: jest.fn().mockResolvedValue({ isEligible: true }),
}));

jest.mock('@/modules/location/application/driver-location-service', () => ({
  addDriverToLiveIndex: jest.fn().mockResolvedValue(undefined),
}));

import { prisma } from '@/shared/database/prisma';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { addDriverToLiveIndex } from '@/modules/location/application/driver-location-service';

describe('DriverJourneyService', () => {
  const mockGetOrCreateProfile = getOrCreateDriverProfile as jest.Mock;
  const mockFindUniqueBooking = prisma.booking.findUnique as jest.Mock;
  const mockFindUniqueOrThrowBooking = prisma.booking.findUniqueOrThrow as jest.Mock;
  const mockFindManyBooking = prisma.booking.findMany as jest.Mock;

  const mockDriverProfile = {
    id: 'drv-prof-1',
    userId: 'user-drv-1',
    onboardingStatus: DriverOnboardingStatus.COMPLETED,
    availabilityStatus: DriverAvailabilityStatus.BUSY,
  };

  const mockBookingAssigned = {
    id: 'bk-100',
    customerId: 'cust-1',
    driverProfileId: 'drv-prof-1',
    status: BookingStatus.DRIVER_ASSIGNED,
    bookingType: 'ONE_WAY',
    pickupLatitude: 28.6139,
    pickupLongitude: 77.209,
    pickupAddress: 'Connaught Place',
    pickupLabel: null,
    requestedStartTime: null,
    estimatedDurationMinutes: 60,
    customerNotes: null,
    assignedAt: new Date(),
    driverEnRouteAt: null,
    driverArrivedAt: null,
    tripStartedAt: null,
    tripCompletedAt: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrCreateProfile.mockResolvedValue(mockDriverProfile);
  });

  describe('startEnRoute', () => {
    it('transitions status to DRIVER_EN_ROUTE', async () => {
      mockFindUniqueBooking.mockResolvedValue(mockBookingAssigned);
      mockFindUniqueOrThrowBooking.mockResolvedValue({
        ...mockBookingAssigned,
        status: BookingStatus.DRIVER_EN_ROUTE,
        driverEnRouteAt: new Date(),
      });

      const result = await startEnRoute('user-drv-1', 'bk-100');
      expect(result.status).toBe(BookingStatus.DRIVER_EN_ROUTE);
      expect(mockTx.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bk-100' },
          data: expect.objectContaining({ status: BookingStatus.DRIVER_EN_ROUTE }),
        }),
      );
    });
  });

  describe('markArrived', () => {
    it('transitions status to DRIVER_ARRIVED', async () => {
      const mockEnRouteBooking = {
        ...mockBookingAssigned,
        status: BookingStatus.DRIVER_EN_ROUTE,
      };
      mockFindUniqueBooking.mockResolvedValue(mockEnRouteBooking);
      mockFindUniqueOrThrowBooking.mockResolvedValue({
        ...mockEnRouteBooking,
        status: BookingStatus.DRIVER_ARRIVED,
        driverArrivedAt: new Date(),
      });

      const result = await markArrived('user-drv-1', 'bk-100');
      expect(result.status).toBe(BookingStatus.DRIVER_ARRIVED);
    });
  });

  describe('startTrip', () => {
    it('transitions status to TRIP_IN_PROGRESS', async () => {
      const mockArrivedBooking = {
        ...mockBookingAssigned,
        status: BookingStatus.DRIVER_ARRIVED,
      };
      mockFindUniqueBooking.mockResolvedValue(mockArrivedBooking);
      mockFindUniqueOrThrowBooking.mockResolvedValue({
        ...mockArrivedBooking,
        status: BookingStatus.TRIP_IN_PROGRESS,
        tripStartedAt: new Date(),
      });

      const result = await startTrip('user-drv-1', 'bk-100');
      expect(result.status).toBe(BookingStatus.TRIP_IN_PROGRESS);
    });
  });

  describe('completeTrip', () => {
    it('transitions status to TRIP_COMPLETED and restores driver availability to AVAILABLE', async () => {
      const mockInProgressBooking = {
        ...mockBookingAssigned,
        status: BookingStatus.TRIP_IN_PROGRESS,
      };
      mockFindUniqueBooking.mockResolvedValue(mockInProgressBooking);
      mockFindUniqueOrThrowBooking.mockResolvedValue({
        ...mockInProgressBooking,
        status: BookingStatus.TRIP_COMPLETED,
        tripCompletedAt: new Date(),
      });

      const result = await completeTrip('user-drv-1', 'bk-100');

      expect(result.status).toBe(BookingStatus.TRIP_COMPLETED);
      expect(mockTx.driverProfile.update).toHaveBeenCalledWith({
        where: { id: 'drv-prof-1' },
        data: { availabilityStatus: DriverAvailabilityStatus.AVAILABLE },
      });
      expect(addDriverToLiveIndex).toHaveBeenCalledWith('drv-prof-1', expect.anything());
    });
  });

  describe('listDriverBookings', () => {
    it('returns summary of driver bookings', async () => {
      mockFindManyBooking.mockResolvedValue([mockBookingAssigned]);
      const list = await listDriverBookings('user-drv-1');
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('bk-100');
    });
  });
});
