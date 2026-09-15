import { DayOfWeek, ScheduleExceptionType } from '@prisma/client';

export interface WeeklyScheduleEntryDTO {
  id?: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  timezone: string;
  isActive: boolean;
  isOvernight: boolean;
}

export interface ScheduleExceptionDTO {
  id: string;
  date: string; // YYYY-MM-DD
  exceptionType: ScheduleExceptionType;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdAt: string;
}

export interface DriverScheduleOverviewDTO {
  driverProfileId: string;
  timezone: string;
  weeklySchedule: WeeklyScheduleEntryDTO[];
  exceptions: ScheduleExceptionDTO[];
  todayShift: {
    isScheduled: boolean;
    dayOfWeek: DayOfWeek;
    startTime: string | null;
    endTime: string | null;
    isOvernight: boolean;
    exceptionType: ScheduleExceptionType | null;
    status: 'SCHEDULED' | 'OFF' | 'CUSTOM_HOURS' | 'NO_SCHEDULE';
  };
}

export interface UpsertWeeklyScheduleInput {
  entries: {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    timezone?: string;
    isActive?: boolean;
  }[];
}

export interface CreateScheduleExceptionInput {
  date: string; // YYYY-MM-DD
  exceptionType: ScheduleExceptionType;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
}
