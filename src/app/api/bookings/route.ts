import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BookingType } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { createBooking, listCustomerBookings } from '@/modules/booking/application/booking-service';
import { DuplicateBookingIdempotencyError } from '@/modules/booking/domain/errors';

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().trim().min(1).max(500),
  label: z.string().trim().max(200).nullable().optional(),
});

const createBookingSchema = z.object({
  pickupLocation: locationSchema,
  dropoffLocation: locationSchema.nullable().optional(),
  bookingType: z.enum(BookingType).optional(),
  requestedStartTime: z.string().datetime().nullable().optional(),
  estimatedDurationMinutes: z.number().int().min(0).max(10_080).nullable().optional(),
  customerNotes: z.string().trim().max(2000).nullable().optional(),
  numberOfDays: z.number().int().min(1).max(60).nullable().optional(),
  hourlyPackageHours: z.number().int().min(1).max(24).nullable().optional(),
  returnDate: z.string().datetime().nullable().optional(),
  idempotencyKey: z.string().trim().max(200).nullable().optional(),
});

export const POST = withPermission(PERMISSIONS.BOOKINGS_CREATE, async (req, { principal }) => {
  try {
    const body = await req.json();
    const parsed = createBookingSchema.parse(body);
    const idempotencyKey = req.headers.get('x-idempotency-key') || parsed.idempotencyKey || null;

    const booking = await createBooking(
      principal.userId,
      {
        pickupLocation: parsed.pickupLocation,
        dropoffLocation: parsed.dropoffLocation ?? null,
        bookingType: parsed.bookingType,
        requestedStartTime: parsed.requestedStartTime,
        estimatedDurationMinutes: parsed.estimatedDurationMinutes,
        customerNotes: parsed.customerNotes,
        numberOfDays: parsed.numberOfDays,
        hourlyPackageHours: parsed.hourlyPackageHours,
        returnDate: parsed.returnDate,
      },
      idempotencyKey,
    );

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Invalid booking request.', issues: err.issues },
        { status: 400 },
      );
    }
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
