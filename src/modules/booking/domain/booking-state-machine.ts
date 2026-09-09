import { BookingStatus } from '@prisma/client';
import { InvalidBookingStatusTransitionError } from './errors';

const VALID_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  [BookingStatus.DRAFT]: [BookingStatus.SEARCHING_DRIVER, BookingStatus.CANCELLED],
  [BookingStatus.SEARCHING_DRIVER]: [
    BookingStatus.DRIVER_ASSIGNED,
    BookingStatus.CANCELLED,
    BookingStatus.EXPIRED,
  ],
  [BookingStatus.DRIVER_ASSIGNED]: [BookingStatus.DRIVER_EN_ROUTE, BookingStatus.CANCELLED],
  [BookingStatus.DRIVER_EN_ROUTE]: [BookingStatus.DRIVER_ARRIVED, BookingStatus.CANCELLED],
  [BookingStatus.DRIVER_ARRIVED]: [BookingStatus.TRIP_IN_PROGRESS, BookingStatus.CANCELLED],
  [BookingStatus.TRIP_IN_PROGRESS]: [BookingStatus.TRIP_COMPLETED],
  [BookingStatus.TRIP_COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.EXPIRED]: [],
};

/**
 * Validates a proposed booking status transition.
 * Throws InvalidBookingStatusTransitionError if transition is disallowed.
 */
export function validateBookingStatusTransition(
  currentStatus: BookingStatus,
  targetStatus: BookingStatus,
): void {
  if (currentStatus === targetStatus) return; // Idempotent no-op transition

  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new InvalidBookingStatusTransitionError(currentStatus, targetStatus);
  }
}

export interface CancellationPolicyFlags {
  allowAfterAssignment?: boolean;
  allowEnRoute?: boolean;
  allowAfterArrival?: boolean;
}

/**
 * Helper to check whether a booking in currentStatus can be cancelled given operational policy flags.
 */
export function isBookingCancellable(
  status: BookingStatus,
  flags?: CancellationPolicyFlags,
): boolean {
  if (status === BookingStatus.DRAFT || status === BookingStatus.SEARCHING_DRIVER) {
    return true;
  }
  if (status === BookingStatus.DRIVER_ASSIGNED) {
    return flags?.allowAfterAssignment ?? true;
  }
  if (status === BookingStatus.DRIVER_EN_ROUTE) {
    return flags?.allowEnRoute ?? true;
  }
  if (status === BookingStatus.DRIVER_ARRIVED) {
    return flags?.allowAfterArrival ?? false;
  }
  return false;
}
