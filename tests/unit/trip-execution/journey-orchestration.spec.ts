import {
  getJourneyDetails,
  getNotificationIdempotencyKey,
  handleJourneyProximityCheck,
} from '@/modules/trip-execution/application/journey-orchestration-service';
import { BookingStatus, BookingType, DriverAvailabilityStatus } from '@prisma/client';
import type { Db } from '@/shared/database/prisma';

describe('Phase 61 — Intelligent Trip Execution & Journey Orchestration', () => {
  const mockBooking = {
    id: 'b1111111-1111-1111-1111-111111111111',
    customerId: 'c1111111-1111-1111-1111-111111111111',
    driverProfileId: 'd1111111-1111-1111-1111-111111111111',
    status: BookingStatus.DRIVER_EN_ROUTE,
    bookingType: BookingType.ONE_WAY,
    pickupLatitude: 19.076,
    pickupLongitude: 72.8777,
    pickupAddress: 'Bandra West, Mumbai',
    pickupLabel: 'Home',
    dropoffLatitude: 19.2183,
    dropoffLongitude: 72.9781,
    dropoffAddress: 'Thane West, Thane',
    dropoffLabel: 'Office',
    requestedStartTime: new Date(),
    requestedAt: new Date(),
    assignedAt: new Date(),
    driverEnRouteAt: new Date(),
    driverArrivedAt: null,
    tripStartedAt: null,
    tripCompletedAt: null,
    ridePinVerifiedAt: null,
    ridePinVerificationAttemptCount: 0,
    customerNotes: 'Please carry luggage',
    hireDurationMinutes: null,
    customer: {
      id: 'c1111111-1111-1111-1111-111111111111',
      fullName: 'Rahul Sharma',
      phoneNumber: '+919876543210',
      customerProfile: {
        customerRidePinHash: '$2b$10$e8.Z/abcdefghijklmnopqrstuvwxyz1234567890',
      },
    },
    driverProfile: {
      id: 'd1111111-1111-1111-1111-111111111111',
      userId: 'u2222222-2222-2222-2222-222222222222',
      approvalStatus: 'APPROVED',
      verificationStatus: 'VERIFIED',
      availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
      averageRating: '4.85',
      completedTripsCount: 142,
      vehicleModel: 'Maruti Dzire',
      vehicleColor: 'White',
      licensePlate: 'MH02AB1234',
      profilePhotoUrl: 'https://example.com/photo.jpg',
      user: {
        id: 'u2222222-2222-2222-2222-222222222222',
        fullName: 'Rajesh Kumar',
        phoneNumber: '+919876500000',
      },
    },
  };

  const mockDriverLocation = {
    driverProfileId: 'd1111111-1111-1111-1111-111111111111',
    latitude: 19.078, // ~250m from pickup
    longitude: 72.8777,
    accuracy: 10,
    heading: 180,
    speed: 8.5,
    capturedAt: new Date(),
  };

  const createMockDb = (
    bookingOverridden: Record<string, unknown> = {},
    locOverridden: Record<string, unknown> | null = mockDriverLocation,
  ) => {
    return {
      booking: {
        findUnique: jest.fn().mockResolvedValue({
          ...mockBooking,
          ...bookingOverridden,
        }),
      },
      driverCurrentLocation: {
        findUnique: jest.fn().mockResolvedValue(locOverridden),
      },
      outboxEvent: {
        create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
      },
    } as unknown as Db;
  };

  describe('Derived Journey State Calculation', () => {
    it('derives SEARCHING_DRIVER state when booking is in DRAFT or SEARCHING_DRIVER', async () => {
      const db = createMockDb(
        { status: BookingStatus.SEARCHING_DRIVER, driverProfileId: null },
        null,
      );
      const res = await getJourneyDetails(mockBooking.id, 'CUSTOMER', mockBooking.customerId, db);

      expect(res.customer?.derivedState).toBe('SEARCHING_DRIVER');
    });

    it('derives DRIVER_NEAR_PICKUP when driver location is within 500m of pickup', async () => {
      const db = createMockDb({ status: BookingStatus.DRIVER_EN_ROUTE });
      const res = await getJourneyDetails(mockBooking.id, 'CUSTOMER', mockBooking.customerId, db);

      expect(res.customer?.derivedState).toBe('DRIVER_NEAR_PICKUP');
      expect(res.customer?.pickupProximity.isNearPickup).toBe(true);
    });

    it('derives READY_TO_START when driver has arrived at pickup', async () => {
      const db = createMockDb({
        status: BookingStatus.DRIVER_ARRIVED,
        driverArrivedAt: new Date(),
      });
      const res = await getJourneyDetails(mockBooking.id, 'CUSTOMER', mockBooking.customerId, db);

      expect(res.customer?.derivedState).toBe('READY_TO_START');
    });

    it('derives DESTINATION_NEAR when active trip is within 1000m of dropoff', async () => {
      const nearDropoffLoc = {
        ...mockDriverLocation,
        latitude: 19.218,
        longitude: 72.9781,
      };
      const db = createMockDb(
        { status: BookingStatus.TRIP_IN_PROGRESS, tripStartedAt: new Date() },
        nearDropoffLoc,
      );
      const res = await getJourneyDetails(mockBooking.id, 'CUSTOMER', mockBooking.customerId, db);

      expect(res.customer?.derivedState).toBe('DESTINATION_NEAR');
      expect(res.customer?.destinationProximity.isDestinationNear).toBe(true);
    });
  });

  describe('Flexible Driver Hire Support', () => {
    it('calculates active hire time remaining for HOURLY flexible bookings', async () => {
      const tripStartedAt = new Date(Date.now() - 30 * 60 * 1000);
      const db = createMockDb({
        bookingType: BookingType.HOURLY,
        status: BookingStatus.TRIP_IN_PROGRESS,
        tripStartedAt,
        hireDurationMinutes: 240,
        dropoffLatitude: null,
        dropoffLongitude: null,
      });

      const res = await getJourneyDetails(mockBooking.id, 'CUSTOMER', mockBooking.customerId, db);

      expect(res.customer?.destinationProximity.isFlexibleHire).toBe(true);
      expect(res.customer?.destinationProximity.hireActive).toBe(true);
      expect(res.customer?.destinationProximity.hireTimeRemainingMinutes).toBe(210);
    });
  });

  describe('Role-Safe DTO Security & Authorization', () => {
    it('provides secure 6-digit Ride PIN for customer role', async () => {
      const db = createMockDb();
      const res = await getJourneyDetails(mockBooking.id, 'CUSTOMER', mockBooking.customerId, db);

      expect(res.customer?.ridePin).toBeDefined();
      expect(res.customer?.driver?.fullName).toBe('Rajesh Kumar');
    });

    it('prevents customer DTO from exposing internal risk scores', async () => {
      const db = createMockDb();
      const res = await getJourneyDetails(mockBooking.id, 'CUSTOMER', mockBooking.customerId, db);

      expect((res.customer as unknown as Record<string, unknown>).reliability).toBeUndefined();
    });

    it('exposes driver verification status in driver DTO without exposing raw PIN hash', async () => {
      const db = createMockDb();
      const res = await getJourneyDetails(
        mockBooking.id,
        'DRIVER',
        mockBooking.driverProfile.user.id,
        db,
      );

      expect(res.driver?.ridePinVerification.required).toBe(true);
      expect(res.driver?.ridePinVerification.verified).toBe(false);
      expect((res.driver as unknown as Record<string, unknown>).customerProfile).toBeUndefined();
    });

    it('rejects unauthorized customer access to foreign booking', async () => {
      const db = createMockDb();
      await expect(
        getJourneyDetails(mockBooking.id, 'CUSTOMER', 'c9999999-9999-9999-9999-999999999999', db),
      ).rejects.toThrow('Unauthorized access');
    });
  });

  describe('Location Freshness & ETA Strategy', () => {
    it('flags location as STALE when location timestamp is between 120 and 300 seconds old', async () => {
      const staleLoc = {
        ...mockDriverLocation,
        capturedAt: new Date(Date.now() - 200 * 1000),
      };
      const db = createMockDb({}, staleLoc);

      const res = await getJourneyDetails(mockBooking.id, 'CUSTOMER', mockBooking.customerId, db);

      expect(res.customer?.locationFreshness).toBe('STALE');
      expect(res.customer?.eta.isStale).toBe(true);
      expect(res.customer?.eta.displayETA).toBeNull();
    });

    it('flags location as UNAVAILABLE when location timestamp is older than 300 seconds', async () => {
      const unavailableLoc = {
        ...mockDriverLocation,
        capturedAt: new Date(Date.now() - 400 * 1000),
      };
      const db = createMockDb({}, unavailableLoc);

      const res = await getJourneyDetails(mockBooking.id, 'CUSTOMER', mockBooking.customerId, db);

      expect(res.customer?.locationFreshness).toBe('UNAVAILABLE');
      expect(res.customer?.eta.isStale).toBe(true);
      expect(res.customer?.eta.displayETA).toBeNull();
    });
  });

  describe('Notification Idempotency & Deduplication Key', () => {
    it('generates deterministic idempotency key for journey notifications', () => {
      const key = getNotificationIdempotencyKey(
        mockBooking.id,
        mockBooking.customerId,
        'trip.driver.near_pickup',
      );

      expect(key).toBe(
        `journey:${mockBooking.id}:${mockBooking.customerId}:trip.driver.near_pickup`,
      );
    });

    it('emits outbox notification when driver reaches near pickup threshold', async () => {
      const db = createMockDb();
      await handleJourneyProximityCheck(mockBooking.id, db);

      expect(db.outboxEvent.create).toHaveBeenCalled();
    });
  });
});
