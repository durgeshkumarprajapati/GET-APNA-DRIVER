import { BookingStatus, DriverAvailabilityStatus, DriverOnboardingStatus } from '@prisma/client';
import {
  startEnRoute,
  markArrived,
  startTrip,
  completeTrip,
  cancelBookingByDriver,
  listDriverBookings,
} from '@/modules/booking/application/driver-journey-service';
import { hashPassword } from '@/modules/identity/security/password';
import { BookingNotFoundError, BookingNotCancellableError } from '@/modules/booking/domain/errors';

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
  bookingAssignmentAttempt: {
    updateMany: jest.fn(),
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
    driverCurrentLocation: {
      findUnique: jest.fn(),
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

// cancelBookingByDriver calls getBoolean 3x for cancellation-policy flags,
// autoRefundCapturedPaymentOnCancellation (which touches real ledger/wallet
// models this file's mocked prisma object doesn't define) and
// createNotification (which touches real notification-preference models) —
// all mocked here to keep these tests isolated to driver-journey-service
// itself, per the same lesson as the referral/incentive mocks above.
jest.mock('@/shared/config/configuration-service', () => ({
  ...jest.requireActual('@/shared/config/configuration-service'),
  getBoolean: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/modules/finance/application/services/refund-service', () => ({
  autoRefundCapturedPaymentOnCancellation: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/modules/notification/application/notification-service', () => ({
  createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
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
import { getBoolean } from '@/shared/config/configuration-service';
import { autoRefundCapturedPaymentOnCancellation } from '@/modules/finance/application/services/refund-service';
import { createNotification } from '@/modules/notification/application/notification-service';

describe('DriverJourneyService', () => {
  const mockGetOrCreateProfile = getOrCreateDriverProfile as jest.Mock;
  const mockFindUniqueBooking = prisma.booking.findUnique as jest.Mock;
  const mockFindUniqueOrThrowBooking = prisma.booking.findUniqueOrThrow as jest.Mock;
  const mockFindManyBooking = prisma.booking.findMany as jest.Mock;
  const mockGetBoolean = getBoolean as jest.Mock;
  const mockAutoRefund = autoRefundCapturedPaymentOnCancellation as jest.Mock;
  const mockCreateNotification = createNotification as jest.Mock;
  const mockFindUniqueDriverCurrentLocation = prisma.driverCurrentLocation.findUnique as jest.Mock;

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

    it("bills real distance for a pickup-only ONE_WAY trip using the driver's fresh live GPS location, and persists it as the trip dropoff", async () => {
      const mockInProgressBooking = {
        ...mockBookingAssigned,
        status: BookingStatus.TRIP_IN_PROGRESS,
        tripStartedAt: new Date(Date.now() - 20 * 60 * 1000),
      };
      mockFindUniqueBooking.mockResolvedValue(mockInProgressBooking);
      mockFindUniqueOrThrowBooking.mockResolvedValue({
        ...mockInProgressBooking,
        status: BookingStatus.TRIP_COMPLETED,
        tripCompletedAt: new Date(),
      });
      mockFindUniqueDriverCurrentLocation.mockResolvedValue({
        latitude: 28.63,
        longitude: 77.22,
        capturedAt: new Date(Date.now() - 10 * 1000),
      });

      await completeTrip('user-drv-1', 'bk-100');

      expect(mockFindUniqueDriverCurrentLocation).toHaveBeenCalledWith({
        where: { driverProfileId: 'drv-prof-1' },
      });
      expect(mockTx.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bk-100' },
          data: expect.objectContaining({
            dropoffLatitude: 28.63,
            dropoffLongitude: 77.22,
            dropoffAddress: expect.stringContaining('auto-captured'),
          }),
        }),
      );
    });

    it('falls back to the existing base-fare-plus-duration billing (no fabricated dropoff) when no fresh driver location exists for a pickup-only trip', async () => {
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
      mockFindUniqueDriverCurrentLocation.mockResolvedValue(null);

      await completeTrip('user-drv-1', 'bk-100');

      expect(mockTx.booking.update).toHaveBeenCalledWith({
        where: { id: 'bk-100' },
        data: {
          status: BookingStatus.TRIP_COMPLETED,
          tripCompletedAt: expect.any(Date),
          finalFareAmount: expect.any(String),
        },
      });
    });
  });

  describe('cancelBookingByDriver', () => {
    it('cancels an assigned booking, restores driver availability, notifies the customer, triggers auto-refund, and fires the booking.driver.cancelled outbox event', async () => {
      mockFindUniqueBooking.mockResolvedValue(mockBookingAssigned);
      mockFindUniqueOrThrowBooking.mockResolvedValue({
        ...mockBookingAssigned,
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: 'user-drv-1',
        driverProfileId: null,
      });

      const result = await cancelBookingByDriver('user-drv-1', 'bk-100', 'Vehicle breakdown');

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(mockTx.booking.update).toHaveBeenCalledWith({
        where: { id: 'bk-100' },
        data: expect.objectContaining({
          status: BookingStatus.CANCELLED,
          cancelledBy: 'user-drv-1',
          cancellationReason: 'Vehicle breakdown',
          driverProfileId: null,
        }),
      });
      expect(mockTx.bookingAssignmentAttempt.updateMany).toHaveBeenCalledWith({
        where: { bookingId: 'bk-100', status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      expect(mockTx.driverProfile.update).toHaveBeenCalledWith({
        where: { id: 'drv-prof-1' },
        data: { availabilityStatus: DriverAvailabilityStatus.AVAILABLE },
      });
      expect(insertOutboxEvent).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          eventType: 'booking.driver.cancelled',
          payload: expect.objectContaining({
            bookingId: 'bk-100',
            customerId: 'cust-1',
            driverProfileId: 'drv-prof-1',
          }),
        }),
      );
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'cust-1', category: 'BOOKING' }),
      );
      expect(mockAutoRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: 'bk-100',
          customerId: 'cust-1',
          actorUserId: 'user-drv-1',
        }),
        expect.anything(),
      );
    });

    it('rejects cancellation once the driver has already arrived and the after-arrival policy flag is disabled', async () => {
      const mockArrivedBooking = {
        ...mockBookingAssigned,
        status: BookingStatus.DRIVER_ARRIVED,
      };
      mockFindUniqueBooking.mockResolvedValue(mockArrivedBooking);
      mockGetBoolean.mockImplementation((key: string, fallback: boolean) =>
        Promise.resolve(
          key === 'booking.lifecycle.allow_customer_cancellation_after_arrival' ? false : fallback,
        ),
      );

      await expect(cancelBookingByDriver('user-drv-1', 'bk-100')).rejects.toBeInstanceOf(
        BookingNotCancellableError,
      );
      expect(mockTx.booking.update).not.toHaveBeenCalled();
      expect(mockAutoRefund).not.toHaveBeenCalled();
    });

    it('throws BookingNotFoundError (not a permission error) when the booking is not assigned to the requesting driver', async () => {
      mockFindUniqueBooking.mockResolvedValue({
        ...mockBookingAssigned,
        driverProfileId: 'some-other-driver-profile',
      });

      await expect(cancelBookingByDriver('user-drv-1', 'bk-100')).rejects.toBeInstanceOf(
        BookingNotFoundError,
      );
      expect(mockTx.booking.update).not.toHaveBeenCalled();
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
