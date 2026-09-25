import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BookingType } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { createBooking, listCustomerBookings } from '@/modules/booking/application/booking-service';
import { DuplicateBookingIdempotencyError } from '@/modules/booking/domain/errors';
import { AppError, toErrorResponse } from '@/shared/errors/app-error';

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().trim().min(1).max(500),
  label: z.string().trim().max(200).nullable().optional(),
});

const serviceRecipientSchema = z.object({
  fullName: z.string().trim().min(1, 'Service recipient full name is required').max(100),
  phone: z.string().trim().min(8, 'Valid phone number is required').max(25),
  email: z.string().trim().email().nullable().optional().or(z.literal('')),
  relationship: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  notifyViaWhatsApp: z.boolean().optional().default(true),
});

const createBookingSchema = z.object({
  pickupLocation: locationSchema,
  dropoffLocation: locationSchema.nullable().optional(),
  bookingType: z.nativeEnum(BookingType).optional(),
  requestedStartTime: z.string().datetime().nullable().optional(),
  estimatedDurationMinutes: z.number().int().min(0).max(525_600).nullable().optional(),
  hireDurationMinutes: z.number().int().min(1).max(525_600).nullable().optional(),
  hireStartAt: z.string().datetime().nullable().optional(),
  hireEndAt: z.string().datetime().nullable().optional(),
  customerNotes: z.string().trim().max(2000).nullable().optional(),
  numberOfDays: z.number().int().min(1).max(365).nullable().optional(),
  numberOfWeeks: z.number().int().min(1).max(52).nullable().optional(),
  numberOfMonths: z.number().int().min(1).max(12).nullable().optional(),
  hourlyPackageHours: z.number().int().min(1).max(24).nullable().optional(),
  returnDate: z.string().datetime().nullable().optional(),
  idempotencyKey: z.string().trim().max(200).nullable().optional(),
  promotionCode: z.string().trim().max(50).nullable().optional(),
  preferredDriverProfileId: z.string().uuid().nullable().optional(),
  serviceRecipient: serviceRecipientSchema.nullable().optional(),
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
        hireDurationMinutes: parsed.hireDurationMinutes,
        hireStartAt: parsed.hireStartAt,
        hireEndAt: parsed.hireEndAt,
        customerNotes: parsed.customerNotes,
        numberOfDays: parsed.numberOfDays,
        numberOfWeeks: parsed.numberOfWeeks,
        numberOfMonths: parsed.numberOfMonths,
        hourlyPackageHours: parsed.hourlyPackageHours,
        returnDate: parsed.returnDate,
        promotionCode: parsed.promotionCode,
        preferredDriverProfileId: parsed.preferredDriverProfileId,
        serviceRecipient: parsed.serviceRecipient,
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
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.statusCode },
      );
    }
    return toErrorResponse(err, req.nextUrl.pathname);
  }
});

import { queryCustomerBookings } from '@/modules/booking/application/customer-booking-query-service';

export const GET = withPermission(PERMISSIONS.BOOKINGS_READ, async (req, { principal }) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const hasParams = searchParams.toString().length > 0;

    if (hasParams) {
      const page = parseInt(searchParams.get('page') || '1', 10);
      const pageSize = parseInt(searchParams.get('pageSize') || '15', 10);
      const statusTab = (searchParams.get('statusTab') || 'ALL').toUpperCase() as
        'ALL' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
      const startDate = searchParams.get('startDate') || undefined;
      const endDate = searchParams.get('endDate') || undefined;
      const search = searchParams.get('search') || undefined;
      const paymentStatus = searchParams.get('paymentStatus') || undefined;

      const result = await queryCustomerBookings(principal.userId, {
        page,
        pageSize,
        statusTab,
        startDate,
        endDate,
        search,
        paymentStatus,
      });

      return NextResponse.json({ success: true, ...result }, { status: 200 });
    }

    const bookings = await listCustomerBookings(principal.userId);
    return NextResponse.json({ bookings }, { status: 200 });
  } catch (err: unknown) {
    return toErrorResponse(err, req.nextUrl.pathname);
  }
});
