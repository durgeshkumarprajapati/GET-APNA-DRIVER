import { BookingStatus } from '@prisma/client';
import {
  validateBookingStatusTransition,
  isBookingCancellable,
} from '@/modules/booking/domain/booking-state-machine';
import { InvalidBookingStatusTransitionError } from '@/modules/booking/domain/errors';

describe('TripLifecycleStateMachine', () => {
  it('allows full sequential trip lifecycle status transitions', () => {
    expect(() =>
      validateBookingStatusTransition(BookingStatus.DRIVER_ASSIGNED, BookingStatus.DRIVER_EN_ROUTE),
    ).not.toThrow();

    expect(() =>
      validateBookingStatusTransition(BookingStatus.DRIVER_EN_ROUTE, BookingStatus.DRIVER_ARRIVED),
    ).not.toThrow();

    expect(() =>
      validateBookingStatusTransition(BookingStatus.DRIVER_ARRIVED, BookingStatus.TRIP_IN_PROGRESS),
    ).not.toThrow();

    expect(() =>
      validateBookingStatusTransition(BookingStatus.TRIP_IN_PROGRESS, BookingStatus.TRIP_COMPLETED),
    ).not.toThrow();
  });

  it('rejects out-of-order or invalid trip lifecycle transitions', () => {
    expect(() =>
      validateBookingStatusTransition(BookingStatus.DRIVER_ASSIGNED, BookingStatus.TRIP_COMPLETED),
    ).toThrow(InvalidBookingStatusTransitionError);

    expect(() =>
      validateBookingStatusTransition(
        BookingStatus.DRIVER_ASSIGNED,
        BookingStatus.TRIP_IN_PROGRESS,
      ),
    ).toThrow(InvalidBookingStatusTransitionError);

    expect(() =>
      validateBookingStatusTransition(BookingStatus.TRIP_COMPLETED, BookingStatus.TRIP_IN_PROGRESS),
    ).toThrow(InvalidBookingStatusTransitionError);

    expect(() =>
      validateBookingStatusTransition(BookingStatus.TRIP_COMPLETED, BookingStatus.DRIVER_EN_ROUTE),
    ).toThrow(InvalidBookingStatusTransitionError);
  });

  it('correctly evaluates cancellation policies across lifecycle states', () => {
    expect(isBookingCancellable(BookingStatus.SEARCHING_DRIVER)).toBe(true);
    expect(isBookingCancellable(BookingStatus.DRIVER_ASSIGNED)).toBe(true);
    expect(isBookingCancellable(BookingStatus.DRIVER_EN_ROUTE)).toBe(true);

    expect(isBookingCancellable(BookingStatus.TRIP_IN_PROGRESS)).toBe(false);
    expect(isBookingCancellable(BookingStatus.TRIP_COMPLETED)).toBe(false);

    expect(isBookingCancellable(BookingStatus.DRIVER_EN_ROUTE, { allowEnRoute: false })).toBe(
      false,
    );
    expect(isBookingCancellable(BookingStatus.DRIVER_ARRIVED, { allowAfterArrival: true })).toBe(
      true,
    );
  });
});
