import { DayOfWeek, ScheduleExceptionType } from '@prisma/client';
import {
  driverScheduleService,
  validateTimeFormat,
  parseTimeMinutes,
  isOvernightShift,
  getDayOfWeekFromDate,
} from '@/modules/driver/application/services/driver-schedule-service';
import { prisma } from '@/shared/database/prisma';
import {
  InvalidScheduleTimeError,
  ScheduleExceptionNotFoundError,
} from '@/modules/driver/domain/errors';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    driverProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    driverSchedule: {
      upsert: jest.fn(),
      count: jest.fn(),
    },
    driverScheduleException: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    outboxEvent: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

jest.mock('@/modules/driver/application/services/driver-profile-service', () => ({
  getOrCreateDriverProfile: jest.fn(),
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

describe('DriverScheduleService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Time Validation & Helpers', () => {
    it('validates 24-hour HH:mm time string correctly', () => {
      expect(() => validateTimeFormat('09:00')).not.toThrow();
      expect(() => validateTimeFormat('23:59')).not.toThrow();
      expect(() => validateTimeFormat('00:00')).not.toThrow();
      expect(() => validateTimeFormat('24:00')).toThrow(InvalidScheduleTimeError);
      expect(() => validateTimeFormat('9:00')).toThrow(InvalidScheduleTimeError);
      expect(() => validateTimeFormat('invalid')).toThrow(InvalidScheduleTimeError);
    });

    it('parses time into minutes correctly', () => {
      expect(parseTimeMinutes('00:00')).toBe(0);
      expect(parseTimeMinutes('09:30')).toBe(570);
      expect(parseTimeMinutes('18:00')).toBe(1080);
    });

    it('identifies overnight shifts spanning past midnight', () => {
      expect(isOvernightShift('09:00', '18:00')).toBe(false);
      expect(isOvernightShift('22:00', '06:00')).toBe(true);
      expect(isOvernightShift('20:00', '20:00')).toBe(true);
    });

    it('extracts DayOfWeek in timezone', () => {
      const monday = new Date('2026-09-14T10:00:00Z'); // 2026-09-14 is Monday
      expect(getDayOfWeekFromDate(monday, 'Asia/Kolkata')).toBe(DayOfWeek.MONDAY);
    });
  });

  describe('getDriverSchedule', () => {
    it('throws error if driver profile not found', async () => {
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(driverScheduleService.getDriverSchedule('non-existent')).rejects.toThrow(
        'Driver profile not found.',
      );
    });

    it('returns full driver weekly schedule and exceptions overview', async () => {
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'prof-1',
        schedules: [
          {
            id: 'sched-1',
            dayOfWeek: DayOfWeek.MONDAY,
            startTime: '08:00',
            endTime: '17:00',
            timezone: 'Asia/Kolkata',
            isActive: true,
            isOvernight: false,
          },
        ],
        scheduleExceptions: [
          {
            id: 'ex-1',
            date: new Date('2026-09-14T00:00:00Z'),
            exceptionType: ScheduleExceptionType.OFF,
            startTime: null,
            endTime: null,
            reason: 'Sick leave',
            createdAt: new Date(),
          },
        ],
      });

      const overview = await driverScheduleService.getDriverSchedule('prof-1');

      expect(overview.driverProfileId).toBe('prof-1');
      expect(overview.timezone).toBe('Asia/Kolkata');
      expect(overview.weeklySchedule).toHaveLength(7);
      expect(overview.exceptions).toHaveLength(1);
    });
  });

  describe('upsertDriverWeeklySchedule', () => {
    it('upserts schedule entries successfully within transaction', async () => {
      (getOrCreateDriverProfile as jest.Mock).mockResolvedValue({ id: 'prof-1', userId: 'user-1' });
      (prisma.driverSchedule.upsert as jest.Mock).mockImplementation(({ create }) =>
        Promise.resolve({
          id: 'sched-1',
          ...create,
        }),
      );

      const entries = [
        {
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '09:00',
          endTime: '17:00',
          timezone: 'Asia/Kolkata',
          isActive: true,
        },
      ];

      const result = await driverScheduleService.upsertDriverWeeklySchedule('user-1', entries);

      expect(result).toHaveLength(1);
      expect(result[0].dayOfWeek).toBe(DayOfWeek.MONDAY);
      expect(prisma.driverSchedule.upsert).toHaveBeenCalled();
    });

    it('throws error if time format is invalid', async () => {
      (getOrCreateDriverProfile as jest.Mock).mockResolvedValue({ id: 'prof-1', userId: 'user-1' });

      const entries = [
        {
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '9:00', // Invalid format
          endTime: '17:00',
        },
      ];

      await expect(
        driverScheduleService.upsertDriverWeeklySchedule('user-1', entries),
      ).rejects.toThrow(InvalidScheduleTimeError);
    });
  });

  describe('createScheduleException', () => {
    it('creates exception successfully', async () => {
      (getOrCreateDriverProfile as jest.Mock).mockResolvedValue({ id: 'prof-1', userId: 'user-1' });
      (prisma.driverScheduleException.upsert as jest.Mock).mockResolvedValue({
        id: 'ex-1',
        driverProfileId: 'prof-1',
        date: new Date('2026-09-15T00:00:00Z'),
        exceptionType: ScheduleExceptionType.OFF,
        startTime: null,
        endTime: null,
        reason: 'Personal leave',
        createdAt: new Date(),
      });

      const result = await driverScheduleService.createScheduleException('user-1', {
        date: '2026-09-15',
        exceptionType: ScheduleExceptionType.OFF,
        reason: 'Personal leave',
      });

      expect(result.id).toBe('ex-1');
      expect(result.exceptionType).toBe(ScheduleExceptionType.OFF);
    });

    it('validates custom hours parameters', async () => {
      (getOrCreateDriverProfile as jest.Mock).mockResolvedValue({ id: 'prof-1', userId: 'user-1' });

      await expect(
        driverScheduleService.createScheduleException('user-1', {
          date: '2026-09-15',
          exceptionType: ScheduleExceptionType.CUSTOM_HOURS,
        }),
      ).rejects.toThrow(InvalidScheduleTimeError);
    });
  });

  describe('deleteScheduleException', () => {
    it('throws error if exception not found for user', async () => {
      (getOrCreateDriverProfile as jest.Mock).mockResolvedValue({ id: 'prof-1', userId: 'user-1' });
      (prisma.driverScheduleException.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        driverScheduleService.deleteScheduleException('user-1', 'invalid-ex-id'),
      ).rejects.toThrow(ScheduleExceptionNotFoundError);
    });

    it('deletes exception when exists', async () => {
      (getOrCreateDriverProfile as jest.Mock).mockResolvedValue({ id: 'prof-1', userId: 'user-1' });
      (prisma.driverScheduleException.findFirst as jest.Mock).mockResolvedValue({
        id: 'ex-1',
        driverProfileId: 'prof-1',
      });

      await driverScheduleService.deleteScheduleException('user-1', 'ex-1');

      expect(prisma.driverScheduleException.delete).toHaveBeenCalledWith({ where: { id: 'ex-1' } });
    });
  });

  describe('isDriverWithinSchedule', () => {
    it('returns true if driver has no configured schedules (rollout compatibility fallback)', async () => {
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'prof-1',
        schedules: [],
        scheduleExceptions: [],
      });
      (prisma.driverSchedule.count as jest.Mock).mockResolvedValue(0);

      const isWithin = await driverScheduleService.isDriverWithinSchedule('prof-1');
      expect(isWithin).toBe(true);
    });

    it('returns false on day off exception', async () => {
      const mondayDate = new Date('2026-09-14T10:00:00Z'); // Monday 2026-09-14
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'prof-1',
        schedules: [
          {
            dayOfWeek: DayOfWeek.MONDAY,
            startTime: '09:00',
            endTime: '18:00',
            timezone: 'Asia/Kolkata',
            isActive: true,
            isOvernight: false,
          },
        ],
        scheduleExceptions: [
          {
            date: new Date('2026-09-14T00:00:00Z'),
            exceptionType: ScheduleExceptionType.OFF,
          },
        ],
      });
      (prisma.driverSchedule.count as jest.Mock).mockResolvedValue(1);

      const isWithin = await driverScheduleService.isDriverWithinSchedule('prof-1', mondayDate);
      expect(isWithin).toBe(false);
    });

    it('handles overnight shifts accurately', async () => {
      (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'prof-1',
        schedules: [
          {
            dayOfWeek: DayOfWeek.MONDAY,
            startTime: '22:00',
            endTime: '06:00',
            timezone: 'Asia/Kolkata',
            isActive: true,
            isOvernight: true,
          },
        ],
        scheduleExceptions: [],
      });
      (prisma.driverSchedule.count as jest.Mock).mockResolvedValue(1);

      // 23:00 Monday (17:30 UTC on 2026-09-14) is within shift
      const lateNight = new Date('2026-09-14T17:30:00Z');
      const isWithin = await driverScheduleService.isDriverWithinSchedule('prof-1', lateNight);
      expect(isWithin).toBe(true);
    });
  });
});
