import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { createBooking } from '@/modules/booking/application/booking-service';
import { prisma } from '@/shared/database/prisma';
import { toErrorResponse } from '@/shared/errors/app-error';
import { z } from 'zod';
import { BookingType } from '@prisma/client';

const locationSchema = z.object({
  address: z.string().min(1, 'Pickup address is required'),
  label: z.string().nullable().optional(),
  latitude: z.number(),
  longitude: z.number(),
});

const oneTapSchema = z.object({
  pickupLocation: locationSchema,
  dropoffLocation: locationSchema.nullable().optional(),
  bookingType: z.nativeEnum(BookingType).default(BookingType.ONE_WAY),
  // Must be a real VehicleCategory.code (MINI_CAR/CAR/LONG_CAR/SUV/...) — see
  // smart-rebooking-service.ts and booking-service.ts's own validation.
  vehicleCategoryCode: z.string().optional().default('CAR'),
  savedPersonId: z.string().nullable().optional(),
  preferredDriverId: z.string().nullable().optional(),
  customerNotes: z.string().nullable().optional(),
  idempotencyKey: z.string().optional(),
});

export const POST = withPermission(
  PERMISSIONS.BOOKINGS_CREATE,
  async (req: NextRequest, { principal }) => {
    try {
      const body = await req.json();
      const parsed = oneTapSchema.parse(body);

      let serviceRecipient = null;
      if (parsed.savedPersonId) {
        // Scoped to this customer's own saved people — a forged savedPersonId
        // from another customer's contacts must never be usable as this
        // booking's service recipient.
        const person = await prisma.customerSavedPerson.findFirst({
          where: { id: parsed.savedPersonId, customerId: principal.userId },
        });
        if (person) {
          serviceRecipient = {
            fullName: person.fullName,
            phone: person.phone,
            relationship: person.relationship || 'Friend / Family',
            email: person.email || null,
            notes: person.notes || null,
          };
        }
      }

      const bookingInput = {
        pickupLocation: {
          address: parsed.pickupLocation.address,
          label: parsed.pickupLocation.label || null,
          latitude: parsed.pickupLocation.latitude,
          longitude: parsed.pickupLocation.longitude,
        },
        dropoffLocation: parsed.dropoffLocation
          ? {
              address: parsed.dropoffLocation.address,
              label: parsed.dropoffLocation.label || null,
              latitude: parsed.dropoffLocation.latitude,
              longitude: parsed.dropoffLocation.longitude,
            }
          : null,
        bookingType: parsed.bookingType as BookingType,
        vehicleCategoryCode: parsed.vehicleCategoryCode,
        preferredDriverProfileId: parsed.preferredDriverId || null,
        serviceRecipient,
        customerNotes: parsed.customerNotes || 'One-tap repeat booking from Smart Rebooking Engine',
      };

      // A Date.now()-based fallback would defeat idempotency entirely (it's
      // different on every request, including genuine retries) — the client
      // (OneTapReviewModal) always generates and sends a stable key for the
      // review session, so this only triggers for a caller that skipped that
      // step, in which case no duplicate protection is possible anyway.
      const idempotencyKey =
        parsed.idempotencyKey || `one-tap-${principal.userId}-${crypto.randomUUID()}`;
      const booking = await createBooking(principal.userId, bookingInput, idempotencyKey);

      return NextResponse.json({
        success: true,
        booking,
      });
    } catch (err: unknown) {
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
