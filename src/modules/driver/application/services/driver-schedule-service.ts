import 'server-only';
import {
  DayOfWeek,
  DriverSchedule,
  DriverScheduleException,
  ScheduleExceptionType,
} from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { getOrCreateDriverProfile } from './driver-profile-service';
import { InvalidScheduleTimeError, ScheduleExceptionNotFoundError } from '../../domain/errors';
import {
  CreateScheduleExceptionInput,
  DriverScheduleOverviewDTO,
  ScheduleExceptionDTO,
  WeeklyScheduleEntryDTO,
} from '../../domain/schedule-types';

const DAY_ORDER: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

export function validateTimeFormat(time: string): void {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(time)) {
    throw new InvalidScheduleTimeError(
      `Invalid time format '${time}'. Time must be in 24-hour HH:mm format (00:00 - 23:59).`,
    );
  }
}

export function parseTimeMinutes(time: string): number {
  validateTimeFormat(time);
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function isOvernightShift(startTime: string, endTime: string): boolean {
  const startMin = parseTimeMinutes(startTime);
  const endMin = parseTimeMinutes(endTime);
  return endMin <= startMin;
}

export function getDayOfWeekFromDate(date: Date, timezone = 'Asia/Kolkata'): DayOfWeek {
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', timeZone: timezone };
  const dayName = new Intl.DateTimeFormat('en-US', options).format(date).toUpperCase();
  switch (dayName) {
    case 'MONDAY':
      return DayOfWeek.MONDAY;
    case 'TUESDAY':
      return DayOfWeek.TUESDAY;
    case 'WEDNESDAY':
      return DayOfWeek.WEDNESDAY;
    case 'THURSDAY':
      return DayOfWeek.THURSDAY;
    case 'FRIDAY':
      return DayOfWeek.FRIDAY;
    case 'SATURDAY':
      return DayOfWeek.SATURDAY;
    case 'SUNDAY':
      return DayOfWeek.SUNDAY;
    default:
      return DayOfWeek.MONDAY;
  }
}

export function getLocalDateString(date: Date, timezone = 'Asia/Kolkata'): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  });
  return formatter.format(date);
}

export function getLocalMinutesFromMidnight(date: Date, timezone = 'Asia/Kolkata'): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    timeZone: timezone,
  });
  const parts = formatter.formatToParts(date);
  let hour = 0;
  let minute = 0;
  for (const part of parts) {
    if (part.type === 'hour') hour = parseInt(part.value, 10) % 24;
    if (part.type === 'minute') minute = parseInt(part.value, 10);
  }
  return hour * 60 + minute;
}

export function toWeeklyScheduleEntryDTO(schedule: DriverSchedule): WeeklyScheduleEntryDTO {
  return {
    id: schedule.id,
    dayOfWeek: schedule.dayOfWeek,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    timezone: schedule.timezone,
    isActive: schedule.isActive,
    isOvernight: schedule.isOvernight,
  };
}

export function toScheduleExceptionDTO(exception: DriverScheduleException): ScheduleExceptionDTO {
  return {
    id: exception.id,
    date: exception.date.toISOString().split('T')[0],
    exceptionType: exception.exceptionType,
    startTime: exception.startTime,
    endTime: exception.endTime,
    reason: exception.reason,
    createdAt: exception.createdAt.toISOString(),
  };
}

export class DriverScheduleService {
  /**
   * Retrieves full driver schedule, upcoming exceptions, and today's shift overview.
   */
  async getDriverSchedule(
    driverProfileId: string,
    db: Db = prisma,
  ): Promise<DriverScheduleOverviewDTO> {
    const profile = await db.driverProfile.findUnique({
      where: { id: driverProfileId },
      include: {
        schedules: true,
        scheduleExceptions: {
          where: {
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!profile) {
      throw new Error('Driver profile not found.');
    }

    const timezone = profile.schedules[0]?.timezone || 'Asia/Kolkata';
    const now = new Date();
    const todayDayOfWeek = getDayOfWeekFromDate(now, timezone);
    const todayDateStr = getLocalDateString(now, timezone);

    // Map weekly schedule map
    const scheduleMap = new Map<DayOfWeek, DriverSchedule>();
    for (const s of profile.schedules) {
      scheduleMap.set(s.dayOfWeek, s);
    }

    const sortedSchedules: WeeklyScheduleEntryDTO[] = DAY_ORDER.map((day) => {
      const existing = scheduleMap.get(day);
      if (existing) return toWeeklyScheduleEntryDTO(existing);
      return {
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '18:00',
        timezone,
        isActive: false,
        isOvernight: false,
      };
    });

    const exceptionsDTO: ScheduleExceptionDTO[] =
      profile.scheduleExceptions.map(toScheduleExceptionDTO);
    const todayException = exceptionsDTO.find((e) => e.date === todayDateStr);
    const todayWeekly = scheduleMap.get(todayDayOfWeek);

    let todayShift: DriverScheduleOverviewDTO['todayShift'] = {
      isScheduled: false,
      dayOfWeek: todayDayOfWeek,
      startTime: null,
      endTime: null,
      isOvernight: false,
      exceptionType: null,
      status: 'NO_SCHEDULE',
    };

    if (todayException) {
      todayShift = {
        isScheduled: todayException.exceptionType === ScheduleExceptionType.CUSTOM_HOURS,
        dayOfWeek: todayDayOfWeek,
        startTime: todayException.startTime,
        endTime: todayException.endTime,
        isOvernight:
          todayException.startTime && todayException.endTime
            ? isOvernightShift(todayException.startTime, todayException.endTime)
            : false,
        exceptionType: todayException.exceptionType,
        status:
          todayException.exceptionType === ScheduleExceptionType.CUSTOM_HOURS
            ? 'CUSTOM_HOURS'
            : 'OFF',
      };
    } else if (todayWeekly && todayWeekly.isActive) {
      todayShift = {
        isScheduled: true,
        dayOfWeek: todayDayOfWeek,
        startTime: todayWeekly.startTime,
        endTime: todayWeekly.endTime,
        isOvernight: todayWeekly.isOvernight,
        exceptionType: null,
        status: 'SCHEDULED',
      };
    }

    return {
      driverProfileId,
      timezone,
      weeklySchedule: sortedSchedules,
      exceptions: exceptionsDTO,
      todayShift,
    };
  }

  /**
   * Upserts driver weekly schedule entries.
   */
  async upsertDriverWeeklySchedule(
    userId: string,
    entries: {
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
      timezone?: string;
      isActive?: boolean;
    }[],
    dbClient: Db = prisma,
  ): Promise<WeeklyScheduleEntryDTO[]> {
    return await dbClient.$transaction(async (tx) => {
      const profile = await getOrCreateDriverProfile(userId, tx);

      const updatedSchedules: DriverSchedule[] = [];

      for (const entry of entries) {
        validateTimeFormat(entry.startTime);
        validateTimeFormat(entry.endTime);

        const tz = entry.timezone || 'Asia/Kolkata';
        const active = entry.isActive ?? true;
        const overnight = isOvernightShift(entry.startTime, entry.endTime);

        const updated = await tx.driverSchedule.upsert({
          where: {
            driverProfileId_dayOfWeek: {
              driverProfileId: profile.id,
              dayOfWeek: entry.dayOfWeek,
            },
          },
          update: {
            startTime: entry.startTime,
            endTime: entry.endTime,
            timezone: tz,
            isActive: active,
            isOvernight: overnight,
          },
          create: {
            driverProfileId: profile.id,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
            timezone: tz,
            isActive: active,
            isOvernight: overnight,
          },
        });

        updatedSchedules.push(updated);
      }

      await recordAuditLog(tx, {
        actorUserId: userId,
        action: 'driver.schedule.updated',
        entityType: 'DriverProfile',
        entityId: profile.id,
        afterState: { entriesCount: entries.length },
      });

      await insertOutboxEvent(tx, {
        eventType: 'driver.schedule.updated',
        aggregateType: 'DriverProfile',
        aggregateId: profile.id,
        payload: {
          userId,
          driverProfileId: profile.id,
          updatedDays: entries.map((e) => e.dayOfWeek),
        },
      });

      return updatedSchedules.map(toWeeklyScheduleEntryDTO);
    });
  }

  /**
   * Creates a schedule exception for a driver.
   */
  async createScheduleException(
    userId: string,
    input: CreateScheduleExceptionInput,
    dbClient: Db = prisma,
  ): Promise<ScheduleExceptionDTO> {
    return await dbClient.$transaction(async (tx) => {
      const profile = await getOrCreateDriverProfile(userId, tx);

      const dateObj = new Date(input.date);
      if (isNaN(dateObj.getTime())) {
        throw new InvalidScheduleTimeError(
          `Invalid exception date '${input.date}'. Must be YYYY-MM-DD.`,
        );
      }

      if (input.exceptionType === ScheduleExceptionType.CUSTOM_HOURS) {
        if (!input.startTime || !input.endTime) {
          throw new InvalidScheduleTimeError(
            'Custom hours exception requires both startTime and endTime.',
          );
        }
        validateTimeFormat(input.startTime);
        validateTimeFormat(input.endTime);
      }

      const exception = await tx.driverScheduleException.upsert({
        where: {
          driverProfileId_date: {
            driverProfileId: profile.id,
            date: dateObj,
          },
        },
        update: {
          exceptionType: input.exceptionType,
          startTime: input.startTime || null,
          endTime: input.endTime || null,
          reason: input.reason || null,
        },
        create: {
          driverProfileId: profile.id,
          date: dateObj,
          exceptionType: input.exceptionType,
          startTime: input.startTime || null,
          endTime: input.endTime || null,
          reason: input.reason || null,
        },
      });

      await recordAuditLog(tx, {
        actorUserId: userId,
        action: 'driver.schedule.exception.created',
        entityType: 'DriverScheduleException',
        entityId: exception.id,
        afterState: {
          date: input.date,
          exceptionType: input.exceptionType,
        },
      });

      await insertOutboxEvent(tx, {
        eventType: 'driver.schedule.exception_created',
        aggregateType: 'DriverScheduleException',
        aggregateId: exception.id,
        payload: {
          userId,
          driverProfileId: profile.id,
          exceptionId: exception.id,
          date: input.date,
          exceptionType: input.exceptionType,
        },
      });

      return toScheduleExceptionDTO(exception);
    });
  }

  /**
   * Deletes a schedule exception for a driver.
   */
  async deleteScheduleException(
    userId: string,
    exceptionId: string,
    dbClient: Db = prisma,
  ): Promise<void> {
    const profile = await getOrCreateDriverProfile(userId, dbClient);

    const existing = await dbClient.driverScheduleException.findFirst({
      where: {
        id: exceptionId,
        driverProfileId: profile.id,
      },
    });

    if (!existing) {
      throw new ScheduleExceptionNotFoundError(exceptionId);
    }

    await dbClient.$transaction(async (tx) => {
      await tx.driverScheduleException.delete({
        where: { id: exceptionId },
      });

      await recordAuditLog(tx, {
        actorUserId: userId,
        action: 'driver.schedule.exception.deleted',
        entityType: 'DriverScheduleException',
        entityId: exceptionId,
      });
    });
  }

  /**
   * Evaluates if a driver is within their shift schedule at `targetTime`.
   * Rollout Compatibility Rule: If a driver has NO configured schedule entries,
   * this returns `true` (driver is not blocked by schedule enforcement).
   */
  async isDriverWithinSchedule(
    driverProfileId: string,
    targetTime: Date = new Date(),
    db: Db = prisma,
  ): Promise<boolean> {
    const profile = await db.driverProfile.findUnique({
      where: { id: driverProfileId },
      include: {
        schedules: { where: { isActive: true } },
        scheduleExceptions: true,
      },
    });

    if (!profile) return false;

    // Rollout safety: If driver has zero active configured schedules, default to schedule-neutral (true)
    const activeSchedulesCount = await db.driverSchedule.count({
      where: { driverProfileId, isActive: true },
    });
    if (activeSchedulesCount === 0) {
      return true;
    }

    const timezone = profile.schedules[0]?.timezone || 'Asia/Kolkata';
    const dateStr = getLocalDateString(targetTime, timezone);
    const dayOfWeek = getDayOfWeekFromDate(targetTime, timezone);
    const currentMinutes = getLocalMinutesFromMidnight(targetTime, timezone);

    // 1. Check Date Exception first
    const exception = profile.scheduleExceptions.find(
      (e) => e.date.toISOString().split('T')[0] === dateStr,
    );

    if (exception) {
      if (
        exception.exceptionType === ScheduleExceptionType.OFF ||
        exception.exceptionType === ScheduleExceptionType.HOLIDAY ||
        exception.exceptionType === ScheduleExceptionType.LEAVE
      ) {
        return false;
      }

      if (exception.exceptionType === ScheduleExceptionType.CUSTOM_HOURS) {
        if (!exception.startTime || !exception.endTime) return false;
        const startMin = parseTimeMinutes(exception.startTime);
        const endMin = parseTimeMinutes(exception.endTime);

        if (endMin <= startMin) {
          // Overnight custom shift
          return currentMinutes >= startMin || currentMinutes < endMin;
        }
        return currentMinutes >= startMin && currentMinutes < endMin;
      }
    }

    // 2. Weekly Schedule Check for today. Note: for an overnight shift
    // (endMin <= startMin), only the "evening" portion (currentMinutes >=
    // startMin) can belong to *today's* entry — the "early morning" portion
    // actually belongs to *yesterday's* shift rolling past midnight, and is
    // handled by the midnight-rollover check below. Evaluating currentMinutes
    // < endMin against today's own entry here would be wrong whenever
    // yesterday has a different (or no) schedule than today.
    const daySchedule = profile.schedules.find((s) => s.dayOfWeek === dayOfWeek);
    if (daySchedule && daySchedule.isActive) {
      const startMin = parseTimeMinutes(daySchedule.startTime);
      const endMin = parseTimeMinutes(daySchedule.endTime);
      const isOvernight = daySchedule.isOvernight || endMin <= startMin;

      if (isOvernight) {
        if (currentMinutes >= startMin) return true;
      } else if (currentMinutes >= startMin && currentMinutes < endMin) {
        return true;
      }
    }

    // 3. Midnight-rollover check: an overnight shift that started *yesterday*
    // (e.g. Mon 22:00-06:00) is still active during today's early morning
    // hours, even if today has no schedule entry of its own (or a different
    // one). Yesterday's exception takes priority over yesterday's weekly
    // schedule, mirroring the precedence rule applied to today above.
    const yesterday = new Date(targetTime.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayDateStr = getLocalDateString(yesterday, timezone);
    const yesterdayDayOfWeek = getDayOfWeekFromDate(yesterday, timezone);

    const yesterdayException = profile.scheduleExceptions.find(
      (e) => e.date.toISOString().split('T')[0] === yesterdayDateStr,
    );

    if (yesterdayException) {
      if (
        yesterdayException.exceptionType === ScheduleExceptionType.CUSTOM_HOURS &&
        yesterdayException.startTime &&
        yesterdayException.endTime
      ) {
        const startMin = parseTimeMinutes(yesterdayException.startTime);
        const endMin = parseTimeMinutes(yesterdayException.endTime);
        if (endMin <= startMin && currentMinutes < endMin) return true;
      }
      // OFF / HOLIDAY / LEAVE yesterday: no shift to roll over from.
    } else {
      const yesterdaySchedule = profile.schedules.find((s) => s.dayOfWeek === yesterdayDayOfWeek);
      if (yesterdaySchedule && yesterdaySchedule.isActive) {
        const startMin = parseTimeMinutes(yesterdaySchedule.startTime);
        const endMin = parseTimeMinutes(yesterdaySchedule.endTime);
        const isOvernight = yesterdaySchedule.isOvernight || endMin <= startMin;
        if (isOvernight && currentMinutes < endMin) return true;
      }
    }

    return false;
  }
}

export const driverScheduleService = new DriverScheduleService();
