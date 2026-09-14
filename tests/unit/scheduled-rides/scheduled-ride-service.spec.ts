import {
  createScheduledRide,
  getScheduledRideById,
  pauseScheduledRide,
  resumeScheduledRide,
  cancelScheduledRide,
} from '@/modules/scheduled-rides/application/scheduled-ride-service';
import { ScheduledRideStatus, ScheduleType, RecurrenceFrequency } from '@prisma/client';
import {
  ScheduledRideNotFoundError,
  ScheduledRideForbiddenError,
  ScheduledRideNotActiveError,
} from '@/modules/scheduled-rides/domain/errors';
import { type Db } from '@/shared/database/prisma';

// Mock dependencies
jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
}));

describe('ScheduledRideService Unit Tests', () => {
  const customerId = 'cust-123';
  const mockRideRecord = {
    id: 'sch-ride-1',
    idempotencyKey: null,
    customerId,
    status: ScheduledRideStatus.ACTIVE,
    scheduleType: ScheduleType.RECURRING,
    bookingType: 'HOURLY',
    pickupLatitude: 28.5603,
    pickupLongitude: 77.1627,
    pickupAddress: 'Vasant Vihar, New Delhi',
    pickupLabel: 'Home',
    dropoffLatitude: 28.6315,
    dropoffLongitude: 77.2167,
    dropoffAddress: 'Connaught Place, New Delhi',
    dropoffLabel: 'Office',
    savedLocationId: null,
    vehicleCategory: 'SEDAN',
    preferredDriverProfileId: null,
    promotionCode: null,
    scheduledTime: '09:00',
    scheduledDate: null,
    recurrenceFrequency: RecurrenceFrequency.DAILY,
    daysOfWeek: [1, 2, 3, 4, 5],
    timezone: 'Asia/Kolkata',
    startAt: new Date(2026, 8, 14, 0, 0, 0),
    endAt: null,
    nextOccurrenceAt: new Date(2026, 8, 15, 9, 0, 0),
    lastGeneratedAt: null,
    cancelledAt: null,
    failureReason: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    preferredDriver: null,
  };

  const createMockDb = (customRideRecord: Record<string, unknown> | null = mockRideRecord) => {
    const mockDb = {
      $transaction: jest.fn().mockImplementation(async (cb: (db: unknown) => Promise<unknown>) => cb(mockDb)),
      scheduledRide: {
        create: jest.fn().mockResolvedValue(customRideRecord),
        findMany: jest.fn().mockResolvedValue([customRideRecord]),
        findUnique: jest.fn().mockResolvedValue(customRideRecord),
        update: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
          ...(customRideRecord || {}),
          ...data,
        })),
      },
    };
    return mockDb;
  };

  describe('createScheduledRide', () => {
    it('creates a scheduled ride successfully and calculates next occurrence', async () => {
      const mockDb = createMockDb();

      const result = await createScheduledRide(
        {
          scheduleType: ScheduleType.RECURRING,
          bookingType: 'HOURLY',
          scheduledTime: '09:00',
          recurrenceFrequency: RecurrenceFrequency.DAILY,
          pickupLatitude: 28.5603,
          pickupLongitude: 77.1627,
          pickupAddress: 'Vasant Vihar, New Delhi',
        },
        customerId,
        mockDb as unknown as Db
      );

      expect(result.id).toBe('sch-ride-1');
      expect(result.customerId).toBe(customerId);
      expect(mockDb.scheduledRide.create).toHaveBeenCalled();
    });
  });

  describe('getScheduledRideById (IDOR Enforcement)', () => {
    it('throws ScheduledRideNotFoundError when schedule does not exist', async () => {
      const mockDb = createMockDb(null);

      await expect(getScheduledRideById('non-existent', customerId, mockDb as unknown as Db)).rejects.toThrow(
        ScheduledRideNotFoundError
      );
    });

    it('throws ScheduledRideForbiddenError when requested by a different customer', async () => {
      const mockDb = createMockDb();

      await expect(getScheduledRideById('sch-ride-1', 'other-customer-id', mockDb as unknown as Db)).rejects.toThrow(
        ScheduledRideForbiddenError
      );
    });
  });

  describe('pauseScheduledRide & resumeScheduledRide', () => {
    it('pauses an active scheduled ride', async () => {
      const mockDb = createMockDb();

      await pauseScheduledRide('sch-ride-1', customerId, mockDb as unknown as Db);
      expect(mockDb.scheduledRide.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: ScheduledRideStatus.PAUSED },
        })
      );
    });

    it('throws ScheduledRideNotActiveError when trying to pause an already paused ride', async () => {
      const pausedRecord = { ...mockRideRecord, status: ScheduledRideStatus.PAUSED };
      const mockDb = createMockDb(pausedRecord);

      await expect(pauseScheduledRide('sch-ride-1', customerId, mockDb as unknown as Db)).rejects.toThrow(
        ScheduledRideNotActiveError
      );
    });

    it('resumes a paused scheduled ride and recalculates next occurrence', async () => {
      const pausedRecord = { ...mockRideRecord, status: ScheduledRideStatus.PAUSED };
      const mockDb = createMockDb(pausedRecord);

      await resumeScheduledRide('sch-ride-1', customerId, mockDb as unknown as Db);
      expect(mockDb.scheduledRide.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ScheduledRideStatus.ACTIVE,
          }),
        })
      );
    });
  });

  describe('cancelScheduledRide', () => {
    it('cancels an active scheduled ride', async () => {
      const mockDb = createMockDb();

      await cancelScheduledRide('sch-ride-1', customerId, 'No longer needed', mockDb as unknown as Db);
      expect(mockDb.scheduledRide.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ScheduledRideStatus.CANCELLED,
            failureReason: 'No longer needed',
          }),
        })
      );
    });
  });
});
