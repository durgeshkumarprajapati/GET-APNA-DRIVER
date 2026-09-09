import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { createBooking, listCustomerBookings } from '@/modules/booking/application/booking-service';
import { DuplicateBookingIdempotencyError } from '@/modules/booking/domain/errors';

export const POST = withPermission(PERMISSIONS.BOOKINGS_CREATE, async (req, { principal }) => {
  try {
    const body = await req.json();
    const idempotencyKey = req.headers.get('x-idempotency-key') || body.idempotencyKey || null;

    if (
      !body.pickupLocation ||
      typeof body.pickupLocation.latitude !== 'number' ||
      typeof body.pickupLocation.longitude !== 'number' ||
      !body.pickupLocation.address
    ) {
      return NextResponse.json(
        {
          error: 'INVALID_INPUT',
          message: 'Valid pickupLocation with latitude, longitude, and address is required.',
        },
        { status: 400 },
      );
    }

    const booking = await createBooking(
      principal.userId,
      {
        pickupLocation: {
          latitude: body.pickupLocation.latitude,
          longitude: body.pickupLocation.longitude,
          address: body.pickupLocation.address,
          label: body.pickupLocation.label,
        },
        dropoffLocation: body.dropoffLocation
          ? {
              latitude: body.dropoffLocation.latitude,
              longitude: body.dropoffLocation.longitude,
              address: body.dropoffLocation.address,
              label: body.dropoffLocation.label,
            }
          : null,
        bookingType: body.bookingType,
        requestedStartTime: body.requestedStartTime,
        estimatedDurationMinutes: body.estimatedDurationMinutes,
        customerNotes: body.customerNotes,
        numberOfDays: body.numberOfDays,
        hourlyPackageHours: body.hourlyPackageHours,
        returnDate: body.returnDate,
      },
      idempotencyKey,
    );

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof DuplicateBookingIdempotencyError) {
      return NextResponse.json(
        { error: 'DUPLICATE_IDEMPOTENCY', message: err.message },
        { status: 409 },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to create booking.';
    return NextResponse.json({ error: 'BOOKING_CREATION_FAILED', message }, { status: 400 });
  }
});

export const GET = withPermission(PERMISSIONS.BOOKINGS_READ, async (_req, { principal }) => {
  try {
    const bookings = await listCustomerBookings(principal.userId);
    return NextResponse.json({ bookings }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch bookings.';
    return NextResponse.json({ error: 'FETCH_BOOKINGS_FAILED', message }, { status: 500 });
  }
});
