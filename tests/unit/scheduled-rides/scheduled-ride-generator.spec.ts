import { processDueScheduledRides } from '@/modules/scheduled-rides/application/scheduled-ride-generator';
import { ScheduledRideStatus, ScheduleType, OccurrenceStatus, BookingStatus } from '@prisma/client';

// Mock dependencies
jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
}));

jest.mock('@/modules/pricing/application/fare-calculation-service', () => ({
  calculateEstimatedFare: jest.fn().mockResolvedValue({ totalFareAmount: 650 }),
}));

jest.mock('@/modules/pricing/application/pricing-quote-service', () => ({
  createPricingQuoteSnapshot: jest.fn().mockResolvedValue({ baseFare: 200, total: 650 }),
}));

jest.mock('@/modules/promotion/application/services/promotion-eligibility-service', () => ({
  validateAndReservePromotionUsage: jest.fn().mockResolvedValue({ valid: false }),
}));

jest.mock('@/modules/booking/application/matching-service', () => ({
  findAndOfferNextDriver: jest.fn().mockResolvedValue({ success: true }),
}));

describe('ScheduledRideGenerator Unit Tests', () => {
  const now = new Date('2026-09-14T08:30:00Z');
  const dueOccurrenceTime = new Date('2026-09-14T08:45:00Z');

  const mockDueRide = {
    id: 'sch-ride-due-1',
    customerId: 'cust-1',
    status: ScheduledRideStatus.ACTIVE,
    scheduleType: ScheduleType.ONE_TIME,
    bookingType: 'HOURLY',
    pickupLatitude: 28.5603,
    pickupLongitude: 77.1627,
    pickupAddress: 'Vasant Vihar, New Delhi',
    pickupLabel: 'Home',
    dropoffLatitude: 28.6315,
    dropoffLongitude: 77.2167,
    dropoffAddress: 'Connaught Place, New Delhi',
    dropoffLabel: 'Office',
    scheduledTime: '08:45',
    scheduledDate: new Date('2026-09-14T00:00:00Z'),
    recurrenceFrequency: null,
    daysOfWeek: [],
    startAt: new Date('2026-09-14T00:00:00Z'),
    endAt: null,
    nextOccurrenceAt: dueOccurrenceTime,
    preferredDriverProfileId: 'driver-pref-1',
    promotionCode: null,
    preferredDriver: null,
  };

  const createMockDb = (existingLog: Record<string, unknown> | null = null) => {
    const mockTx = {
      scheduledRideOccurrenceLog: {
        findUnique: jest.fn().mockResolvedValue(existingLog),
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
      booking: {
        create: jest.fn().mockResolvedValue({ id: 'booking-generated-101', status: BookingStatus.SEARCHING_DRIVER }),
      },
      scheduledRide: {
        update: jest.fn().mockResolvedValue({ ...mockDueRide, status: ScheduledRideStatus.COMPLETED }),
      },
    };

    return {
      scheduledRide: {
        findMany: jest.fn().mockResolvedValue([mockDueRide]),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockTx)),
      scheduledRideOccurrenceLog: mockTx.scheduledRideOccurrenceLog,
    };
  };

  it('generates a Booking idempotently for due scheduled ride occurrence', async () => {
    const mockDb = createMockDb() as unknown as Parameters<typeof processDueScheduledRides>[3];

    const result = await processDueScheduledRides(now, 30, 10, mockDb);

    expect(result.processedCount).toBe(1);
    expect(result.generatedBookings).toContain('booking-generated-101');
    expect(result.skippedCount).toBe(0);
    expect(result.failedCount).toBe(0);
  });

  it('skips booking generation if occurrence was already processed (idempotency key match)', async () => {
    const existingLogRecord = {
      id: 'existing-log-1',
      occurrenceIdempotencyKey: `${mockDueRide.id}_${dueOccurrenceTime.toISOString()}`,
      status: OccurrenceStatus.GENERATED,
    };
    const mockDb = createMockDb(existingLogRecord) as unknown as Parameters<typeof processDueScheduledRides>[3];

    const result = await processDueScheduledRides(now, 30, 10, mockDb);

    expect(result.processedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(result.generatedBookings).toHaveLength(0);
  });
});
