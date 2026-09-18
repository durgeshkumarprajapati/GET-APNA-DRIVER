import { BookingStatus, DriverAvailabilityStatus, DriverOnboardingStatus } from '@prisma/client';
import {
  startEnRoute,
  markArrived,
  startTrip,
  completeTrip,
  listDriverBookings,
} from '@/modules/booking/application/driver-journey-service';
import { hashPassword } from '@/modules/identity/security/password';

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
    customerProfile: {
      findUnique: jest.fn(),
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

// completeTrip calls both of these for post-trip milestone/incentive
// evaluation; both were previously unmocked in this file, so `completeTrip`
// tests occasionally reached their real (DB-touching, prisma-mock-shaped-
// wrong) implementations and hung until jest's 5000ms test timeout — an
// intermittent flake unrelated to whatever the test itself was asserting.
jest.mock('@/modules/identity/application/services/referral-service', () => ({
  evaluateAndQualifyReferral: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/modules/incentive/application/services/incentive-evaluator-service', () => ({
  evaluateDriverIncentivesForCompletedTrip: jest.fn().mockResolvedValue(undefined),
}));

// calculateFinalFare (called by completeTrip) pulls in Controlled Dynamic
// Pricing, which in turn queries marketplace-intelligence zone/supply data
// for real — several more unmocked real dependencies transitively reached
// from this one test file. Short-circuiting it here keeps completeTrip
// tests testing completeTrip, not the entire pricing/marketplace stack.
jest.mock('@/modules/dynamic-pricing/application/dynamic-pricing-service', () => ({
  evaluateDynamicPricing: jest.fn().mockResolvedValue({
    baseFareAmount: 0,
    dynamicAdjustmentAmount: 0,
    finalGrossFareAmount: 0,
    appliedPolicyId: null,
    appliedPolicyVersion: null,
    appliedPolicyName: null,
    pressureState: 'NORMAL',
    adjustmentPercentage: 0,
    flatSurgeAmount: 0,
    wasCapped: false,
  }),
}));

import { prisma } from '@/shared/database/prisma';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { addDriverToLiveIndex } from '@/modules/location/application/driver-location-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';

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
    it('transitions status to TRIP_IN_PROGRESS after PIN verification', async () => {
      const mockArrivedBooking = {
        ...mockBookingAssigned,
        status: BookingStatus.DRIVER_ARRIVED,
        ridePinVerificationAttemptCount: 0,
      };
      mockFindUniqueBooking.mockResolvedValue(mockArrivedBooking);
      mockFindUniqueOrThrowBooking.mockResolvedValue({
        ...mockArrivedBooking,
        status: BookingStatus.TRIP_IN_PROGRESS,
        tripStartedAt: new Date(),
      });

      const hash = await hashPassword('729104');
      (prisma.customerProfile.findUnique as jest.Mock).mockResolvedValue({
        customerRidePinHash: hash,
      });

      const result = await startTrip('user-drv-1', 'bk-100', '729104');
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

    it("includes customerId and driverUserId in the 'booking.trip.completed' outbox payload, so the trip-completed notifications (including the customer's rate-your-driver prompt) actually get created", async () => {
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

      await completeTrip('user-drv-1', 'bk-100');

      expect(insertOutboxEvent).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          eventType: 'booking.trip.completed',
          payload: expect.objectContaining({
            bookingId: 'bk-100',
            customerId: 'cust-1',
            driverUserId: 'user-drv-1',
          }),
        }),
      );
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
