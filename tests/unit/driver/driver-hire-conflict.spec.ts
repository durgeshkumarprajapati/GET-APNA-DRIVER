import {
  getDriverHireConflicts,
  assertNoDriverHireConflict,
  DriverHireConflictError,
} from '@/modules/driver/application/services/driver-hire-conflict-service';
import { BookingType, BookingStatus } from '@prisma/client';

import type { Db } from '@/shared/database/prisma';

describe('Driver Hire Conflict Service', () => {
  const mockDb = {
    booking: {
      findMany: jest.fn(),
    },
  } as unknown as Db;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detects overlap when requested hire window intersects an existing booking', async () => {
    const existingStart = new Date('2026-09-17T10:00:00Z');
    const existingEnd = new Date('2026-09-17T18:00:00Z');

    (mockDb.booking.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'existing-booking-1',
        bookingType: BookingType.DAILY,
        status: BookingStatus.DRIVER_ASSIGNED,
        hireStartAt: existingStart,
        hireEndAt: existingEnd,
      },
    ]);

    // Requested: 12:00 to 14:00 (overlaps 10:00 - 18:00)
    const result = await getDriverHireConflicts(
      {
        driverProfileId: 'driver-1',
        hireStartAt: new Date('2026-09-17T12:00:00Z'),
        hireEndAt: new Date('2026-09-17T14:00:00Z'),
      },
      mockDb,
    );

    expect(result.hasConflict).toBe(true);
    expect(result.conflictingBookingId).toBe('existing-booking-1');
  });

  it('allows adjacent non-overlapping bookings using half-open interval semantics [start, end)', async () => {
    const existingStart = new Date('2026-09-17T10:00:00Z');
    const existingEnd = new Date('2026-09-17T14:00:00Z');

    (mockDb.booking.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'existing-booking-1',
        bookingType: BookingType.HOURLY,
        status: BookingStatus.DRIVER_ASSIGNED,
        hireStartAt: existingStart,
        hireEndAt: existingEnd,
      },
    ]);

    // Requested: 14:00 to 16:00 (starts exactly when existing ends) -> ALLOWED
    const result = await getDriverHireConflicts(
      {
        driverProfileId: 'driver-1',
        hireStartAt: new Date('2026-09-17T14:00:00Z'),
        hireEndAt: new Date('2026-09-17T16:00:00Z'),
      },
      mockDb,
    );

    expect(result.hasConflict).toBe(false);
  });

  it('throws DriverHireConflictError when assertNoDriverHireConflict finds overlap', async () => {
    (mockDb.booking.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'existing-booking-1',
        bookingType: BookingType.WEEKLY,
        status: BookingStatus.DRIVER_ASSIGNED,
        hireStartAt: new Date('2026-09-15T00:00:00Z'),
        hireEndAt: new Date('2026-09-22T00:00:00Z'),
      },
    ]);

    await expect(
      assertNoDriverHireConflict(
        {
          driverProfileId: 'driver-1',
          hireStartAt: new Date('2026-09-17T10:00:00Z'),
          hireEndAt: new Date('2026-09-18T10:00:00Z'),
        },
        mockDb,
      ),
    ).rejects.toThrow(DriverHireConflictError);
  });
});
