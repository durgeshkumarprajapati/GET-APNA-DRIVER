import { ScheduleType, RecurrenceFrequency } from '@prisma/client';
import { InvalidRecurrenceConfigurationError } from './errors';

export interface CalculateNextOccurrenceInput {
  scheduleType: ScheduleType;
  scheduledTime: string; // "HH:mm" in 24h format e.g. "08:30"
  scheduledDate?: Date | null;
  recurrenceFrequency?: RecurrenceFrequency | null;
  daysOfWeek?: number[]; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
  startAt?: Date;
  endAt?: Date | null;
  fromTime?: Date;
  timezone?: string;
}

/**
 * Calculates the next deterministic occurrence Date for a scheduled ride.
 * Supports ONE_TIME and RECURRING (DAILY, WEEKLY, CUSTOM_DAYS) schedules.
 */
export function calculateNextOccurrence(input: CalculateNextOccurrenceInput): Date | null {
  const {
    scheduleType,
    scheduledTime,
    scheduledDate,
    recurrenceFrequency,
    daysOfWeek = [],
    startAt = new Date(),
    endAt = null,
    fromTime = new Date(),
  } = input;

  const timeMatch = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/.exec(scheduledTime.trim());
  if (!timeMatch) {
    throw new InvalidRecurrenceConfigurationError(`Invalid scheduledTime format '${scheduledTime}'. Expected HH:mm (e.g. 08:30).`);
  }

  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);

  if (scheduleType === ScheduleType.ONE_TIME) {
    const baseDate = scheduledDate ? new Date(scheduledDate) : new Date(startAt);
    if (isNaN(baseDate.getTime())) {
      throw new InvalidRecurrenceConfigurationError('Invalid scheduledDate provided for ONE_TIME schedule.');
    }

    const occurrence = new Date(baseDate);
    occurrence.setHours(hours, minutes, 0, 0);

    if (occurrence <= fromTime) {
      return null; // Past occurrence
    }

    if (endAt && occurrence > endAt) {
      return null;
    }

    return occurrence;
  }

  // RECURRING schedule validation
  if (!recurrenceFrequency) {
    throw new InvalidRecurrenceConfigurationError('Recurrence frequency is required for RECURRING schedules.');
  }

  let targetDays = [...daysOfWeek];
  if (recurrenceFrequency === RecurrenceFrequency.DAILY) {
    targetDays = [1, 2, 3, 4, 5, 6, 7];
  } else if (recurrenceFrequency === RecurrenceFrequency.WEEKLY) {
    if (targetDays.length === 0) {
      const startDay = getIsoDayOfWeek(startAt);
      targetDays = [startDay];
    }
  } else if (recurrenceFrequency === RecurrenceFrequency.CUSTOM_DAYS) {
    if (targetDays.length === 0) {
      throw new InvalidRecurrenceConfigurationError('CUSTOM_DAYS recurrence requires at least one day of week (1=Mon..7=Sun).');
    }
  }

  // Normalize days to 1-7
  targetDays = targetDays.map((d) => (d === 0 ? 7 : d)).filter((d) => d >= 1 && d <= 7);

  // Search forward up to 366 days
  const cursor = new Date(fromTime > startAt ? fromTime : startAt);
  cursor.setSeconds(0, 0);

  for (let dayOffset = 0; dayOffset <= 366; dayOffset++) {
    const candidate = new Date(cursor);
    candidate.setDate(cursor.getDate() + dayOffset);
    candidate.setHours(hours, minutes, 0, 0);

    const isoDay = getIsoDayOfWeek(candidate);

    if (targetDays.includes(isoDay) && candidate > fromTime) {
      if (endAt && candidate > endAt) {
        return null;
      }
      return candidate;
    }
  }

  return null;
}

/**
 * Returns ISO day of week: 1 = Monday, 2 = Tuesday, ..., 7 = Sunday.
 */
export function getIsoDayOfWeek(date: Date): number {
  const jsDay = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return jsDay === 0 ? 7 : jsDay;
}
