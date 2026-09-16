import {
  getCustomerBookingLocationTelemetry,
  getDriverBookingLocationTelemetry,
} from '@/modules/location/application/booking-location-service';
import { BookingNotFoundError } from '@/modules/booking/domain/errors';

describe('Booking Location Authorization & IDOR Protection Tests', () => {
  const mockDb = {
    booking: {
      findUnique: jest.fn(),
    },
    driverProfile: {
      findUnique: jest.fn(),
    },
    driverCurrentLocation: {
      findUnique: jest.fn(),
    },
    bookingAssignmentAttempt: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCustomerBookingLocationTelemetry', () => {
    it('should throw BookingNotFoundError if booking does not exist', async () => {
      mockDb.booking.findUnique.mockResolvedValue(null);

      await expect(
        getCustomerBookingLocationTelemetry('customer-1', 'nonexistent-booking', mockDb as never),
      ).rejects.toThrow(BookingNotFoundError);
    });

    it('should throw BookingNotFoundError if caller is NOT the customer owner (IDOR Protection)', async () => {
      mockDb.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        customerId: 'customer-OWNER',
        status: 'TRIP_IN_PROGRESS',
      });

      await expect(
        getCustomerBookingLocationTelemetry('customer-ATTACKER', 'booking-1', mockDb as never),
      ).rejects.toThrow(BookingNotFoundError);
    });

    it('should return null driverLocation outside active tracking states', async () => {
      mockDb.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        customerId: 'customer-1',
        status: 'REQUESTED',
        pickupLatitude: 19.076,
        pickupLongitude: 72.8777,
        pickupAddress: 'Mumbai Pickup',
        pickupLabel: 'Home',
        driverProfileId: 'driver-profile-1',
      });

      const result = await getCustomerBookingLocationTelemetry(
        'customer-1',
        'booking-1',
        mockDb as never,
      );

      expect(result.bookingId).toBe('booking-1');
      expect(result.driverLocation).toBeNull();
    });

    it('should return live driver location during TRIP_IN_PROGRESS state', async () => {
      mockDb.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        customerId: 'customer-1',
        status: 'TRIP_IN_PROGRESS',
        pickupLatitude: 19.076,
        pickupLongitude: 72.8777,
        pickupAddress: 'Mumbai Pickup',
        pickupLabel: 'Home',
        driverProfileId: 'driver-profile-1',
        driverProfile: {
          id: 'driver-profile-1',
          displayName: 'John Driver',
          profileImageUrl: '/avatar.png',
        },
      });

      mockDb.driverCurrentLocation.findUnique.mockResolvedValue({
        driverProfileId: 'driver-profile-1',
        latitude: 19.08,
        longitude: 72.88,
        heading: 90,
        speed: 35,
        accuracy: 5,
        capturedAt: new Date('2026-09-15T15:00:00Z'),
      });

      const result = await getCustomerBookingLocationTelemetry(
        'customer-1',
        'booking-1',
        mockDb as never,
      );

      expect(result.bookingId).toBe('booking-1');
      expect(result.driverLocation).not.toBeNull();
      expect(result.driverLocation?.latitude).toBe(19.08);
      expect(result.assignedDriver?.displayName).toBe('John Driver');
    });
  });

  describe('getDriverBookingLocationTelemetry', () => {
    it('should throw BookingNotFoundError if driver profile is missing', async () => {
      mockDb.driverProfile.findUnique.mockResolvedValue(null);

      await expect(
        getDriverBookingLocationTelemetry('driver-user-1', 'booking-1', mockDb as never),
      ).rejects.toThrow(BookingNotFoundError);
    });

    it('should throw BookingNotFoundError if driver is neither assigned nor has an active offer (IDOR)', async () => {
      mockDb.driverProfile.findUnique.mockResolvedValue({ id: 'driver-profile-UNAUTHORIZED' });
      mockDb.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        driverProfileId: 'driver-profile-ASSIGNED',
        status: 'DRIVER_ASSIGNED',
      });
      mockDb.bookingAssignmentAttempt.findFirst.mockResolvedValue(null);

      await expect(
        getDriverBookingLocationTelemetry('driver-user-1', 'booking-1', mockDb as never),
      ).rejects.toThrow(BookingNotFoundError);
    });

    it('should return location telemetry when driver is assigned to booking', async () => {
      mockDb.driverProfile.findUnique.mockResolvedValue({ id: 'driver-profile-1' });
      mockDb.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        driverProfileId: 'driver-profile-1',
        status: 'TRIP_IN_PROGRESS',
        pickupLatitude: 19.076,
        pickupLongitude: 72.8777,
        pickupAddress: 'Pickup Point',
      });
      mockDb.driverCurrentLocation.findUnique.mockResolvedValue({
        latitude: 19.077,
        longitude: 72.878,
        heading: 45,
        speed: 20,
        accuracy: 4,
        capturedAt: new Date(),
      });

      const result = await getDriverBookingLocationTelemetry(
        'driver-user-1',
        'booking-1',
        mockDb as never,
      );

      expect(result.bookingId).toBe('booking-1');
      expect(result.pickupLocation.latitude).toBe(19.076);
      expect(result.driverLocation?.latitude).toBe(19.077);
    });
  });
});
