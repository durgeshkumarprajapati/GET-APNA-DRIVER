import { BookingType } from '@prisma/client';

/**
 * Returns true if the booking mode is point-to-point / trip-based.
 */
export function isPointToPointBooking(bookingType: BookingType): boolean {
  return (
    bookingType === BookingType.POINT_TO_POINT ||
    bookingType === BookingType.ONE_WAY ||
    bookingType === BookingType.ROUND_TRIP
  );
}

/**
 * Returns true if the booking mode is duration-based driver hire.
 */
export function isDriverHireBooking(bookingType: BookingType): boolean {
  return (
    bookingType === BookingType.HOURLY ||
    bookingType === BookingType.DAILY ||
    bookingType === BookingType.WEEKLY ||
    bookingType === BookingType.MONTHLY ||
    bookingType === BookingType.FULL_DAY ||
    bookingType === BookingType.MULTI_DAY
  );
}

/**
 * Duration-based hire types where the customer selects a specific driver at
 * that driver's own rate (see DriverProfile.dailyHireRate/weeklyHireRate/
 * monthlyHireRate) rather than a platform-default rate. Deliberately
 * excludes HOURLY (and FULL_DAY/MULTI_DAY) — the customer only asked for
 * this on daily/weekly/monthly hires, and those other hire types keep the
 * existing soft favorite-driver preference + platform-rate flow unchanged.
 */
export const RATE_SELECTABLE_HIRE_TYPES: readonly BookingType[] = [
  BookingType.DAILY,
  BookingType.WEEKLY,
  BookingType.MONTHLY,
];

export function isRateSelectableHireBooking(bookingType: BookingType): boolean {
  return RATE_SELECTABLE_HIRE_TYPES.includes(bookingType);
}

export type HireRateField = 'dailyHireRate' | 'weeklyHireRate' | 'monthlyHireRate';

/**
 * Maps a rate-selectable booking type to its DriverProfile rate column.
 */
export function hireRateFieldFor(bookingType: BookingType): HireRateField | null {
  switch (bookingType) {
    case BookingType.DAILY:
      return 'dailyHireRate';
    case BookingType.WEEKLY:
      return 'weeklyHireRate';
    case BookingType.MONTHLY:
      return 'monthlyHireRate';
    default:
      return null;
  }
}

/**
 * Returns true if the booking mode supports an optional or explicit drop location.
 * Driver hire modes omit/forbid drop location.
 */
export function supportsDropLocation(bookingType: BookingType): boolean {
  return isPointToPointBooking(bookingType);
}

/**
 * Drop location is NEVER mandatory in Phase 56.
 * Point-to-point drop is optional; driver hire drop is not required.
 */
export function requiresDropLocation(_bookingType: BookingType): boolean {
  return false;
}

/**
 * Returns true if the booking mode requires a hire duration / package selection.
 */
export function requiresHireDuration(bookingType: BookingType): boolean {
  return isDriverHireBooking(bookingType);
}

/**
 * Calculates end timestamp deterministically for duration-based driver hires.
 */
export function calculateHireEndTimestamp(
  bookingType: BookingType,
  durationMinutes: number,
  startAt: Date | string = new Date(),
): Date {
  const startDate = typeof startAt === 'string' ? new Date(startAt) : new Date(startAt.getTime());
  const end = new Date(startDate.getTime());
  const safeMins = Math.max(1, Math.floor(durationMinutes));

  switch (bookingType) {
    case BookingType.HOURLY: {
      const hours = Math.ceil(safeMins / 60);
      end.setHours(end.getHours() + hours);
      return end;
    }

    case BookingType.DAILY:
    case BookingType.FULL_DAY: {
      const days = Math.ceil(safeMins / 1440);
      end.setDate(end.getDate() + days);
      return end;
    }

    case BookingType.WEEKLY: {
      const weeks = Math.ceil(safeMins / 10080);
      end.setDate(end.getDate() + weeks * 7);
      return end;
    }

    case BookingType.MONTHLY: {
      const months = Math.ceil(safeMins / 43200);
      end.setMonth(end.getMonth() + months);
      return end;
    }

    case BookingType.MULTI_DAY: {
      const days = Math.ceil(safeMins / 1440);
      end.setDate(end.getDate() + days);
      return end;
    }

    default:
      return end;
  }
}
