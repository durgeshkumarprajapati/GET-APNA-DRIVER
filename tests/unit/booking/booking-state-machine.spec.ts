import { BookingStatus } from '@prisma/client';
import {
  validateBookingStatusTransition,
  isBookingCancellable,
} from '@/modules/booking/domain/booking-state-machine';
import { InvalidBookingStatusTransitionError } from '@/modules/booking/domain/errors';

describe('BookingStateMachine', () => {
  it('allows valid state transitions', () => {
    expect(() =>
      validateBookingStatusTransition(BookingStatus.DRAFT, BookingStatus.SEARCHING_DRIVER),
    ).not.toThrow();

    expect(() =>
      validateBookingStatusTransition(
        BookingStatus.SEARCHING_DRIVER,
        BookingStatus.DRIVER_ASSIGNED,
      ),
    ).not.toThrow();

    expect(() =>
      validateBookingStatusTransition(BookingStatus.SEARCHING_DRIVER, BookingStatus.CANCELLED),
    ).not.toThrow();

    expect(() =>
      validateBookingStatusTransition(BookingStatus.SEARCHING_DRIVER, BookingStatus.EXPIRED),
    ).not.toThrow();

    expect(() =>
      validateBookingStatusTransition(BookingStatus.DRIVER_ASSIGNED, BookingStatus.CANCELLED),
    ).not.toThrow();
  });

  it('rejects invalid state transitions', () => {
    expect(() =>
      validateBookingStatusTransition(BookingStatus.CANCELLED, BookingStatus.DRIVER_ASSIGNED),
    ).toThrow(InvalidBookingStatusTransitionError);

    expect(() =>
      validateBookingStatusTransition(BookingStatus.EXPIRED, BookingStatus.DRIVER_ASSIGNED),
    ).toThrow(InvalidBookingStatusTransitionError);

    expect(() =>
      validateBookingStatusTransition(
        BookingStatus.DRIVER_ASSIGNED,
        BookingStatus.SEARCHING_DRIVER,
      ),
    ).toThrow(InvalidBookingStatusTransitionError);
  });

  it('correctly identifies cancellable statuses', () => {
    expect(isBookingCancellable(BookingStatus.DRAFT)).toBe(true);
    expect(isBookingCancellable(BookingStatus.SEARCHING_DRIVER)).toBe(true);
    expect(isBookingCancellable(BookingStatus.DRIVER_ASSIGNED)).toBe(true);
    expect(isBookingCancellable(BookingStatus.CANCELLED)).toBe(false);
    expect(isBookingCancellable(BookingStatus.EXPIRED)).toBe(false);
  });
});
