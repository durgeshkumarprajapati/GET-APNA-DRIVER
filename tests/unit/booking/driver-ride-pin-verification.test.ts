import { BookingStatus } from '@prisma/client';
import { startTrip } from '@/modules/booking/application/driver-journey-service';
import {
  InvalidRidePinError,
  MaxRidePinAttemptsExceededError,
} from '@/modules/booking/domain/errors';
import { hashPassword } from '@/modules/identity/security/password';

describe('Phase 26 — Driver Ride PIN Verification on Trip Start', () => {
  let validPinHash: string;

  beforeAll(async () => {
    validPinHash = await hashPassword('948201');
  });

  it('successfully verifies correct Ride PIN and transitions trip to TRIP_IN_PROGRESS', async () => {
    const mockDb = {
      driverProfile: {
        findUnique: jest.fn().mockResolvedValue({ id: 'driver-prof-1', userId: 'driver-user-1' }),
      },
      booking: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'booking-101',
          customerId: 'customer-user-1',
          driverProfileId: 'driver-prof-1',
          status: BookingStatus.DRIVER_ARRIVED,
          ridePinVerificationAttemptCount: 0,
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'booking-101',
          customerId: 'customer-user-1',
          driverProfileId: 'driver-prof-1',
          status: BookingStatus.TRIP_IN_PROGRESS,
          pickupLatitude: 12.9716,
          pickupLongitude: 77.5946,
          pickupAddress: 'MG Road, Bengaluru',
        }),
        update: jest.fn(),
      },
      customerProfile: {
        findUnique: jest.fn().mockResolvedValue({
          customerRidePinHash: validPinHash,
        }),
      },
      bookingLog: { create: jest.fn() },
      outboxEvent: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockDb)),
    };

    const summary = await startTrip(
      'driver-user-1',
      'booking-101',
      '948201',
      mockDb as unknown as Parameters<typeof startTrip>[3],
    );
    expect(summary.status).toBe(BookingStatus.TRIP_IN_PROGRESS);
    expect(mockDb.booking.update).toHaveBeenCalled();
  });

  it('rejects incorrect Ride PIN, increments attempt count, and throws InvalidRidePinError', async () => {
    const mockDb = {
      driverProfile: {
        findUnique: jest.fn().mockResolvedValue({ id: 'driver-prof-1', userId: 'driver-user-1' }),
      },
      booking: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'booking-102',
          customerId: 'customer-user-1',
          driverProfileId: 'driver-prof-1',
          status: BookingStatus.DRIVER_ARRIVED,
          ridePinVerificationAttemptCount: 1,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      customerProfile: {
        findUnique: jest.fn().mockResolvedValue({
          customerRidePinHash: validPinHash,
        }),
      },
      auditLog: { create: jest.fn() },
    };

    await expect(
      startTrip(
        'driver-user-1',
        'booking-102',
        '000000',
        mockDb as unknown as Parameters<typeof startTrip>[3],
      ),
    ).rejects.toThrow(InvalidRidePinError);

    expect(mockDb.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { ridePinVerificationAttemptCount: 2 },
      }),
    );
  });

  it('locks out verification when attempt count reaches 5', async () => {
    const mockDb = {
      driverProfile: {
        findUnique: jest.fn().mockResolvedValue({ id: 'driver-prof-1', userId: 'driver-user-1' }),
      },
      booking: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'booking-103',
          customerId: 'customer-user-1',
          driverProfileId: 'driver-prof-1',
          status: BookingStatus.DRIVER_ARRIVED,
          ridePinVerificationAttemptCount: 5,
        }),
      },
    };

    await expect(
      startTrip(
        'driver-user-1',
        'booking-103',
        '948201',
        mockDb as unknown as Parameters<typeof startTrip>[3],
      ),
    ).rejects.toThrow(MaxRidePinAttemptsExceededError);
  });
});
