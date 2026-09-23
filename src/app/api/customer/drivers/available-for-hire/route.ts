import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BookingType } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  isRateSelectableHireBooking,
  calculateHireEndTimestamp,
} from '@/modules/booking/domain/booking-policy';
import {
  listActiveDriversForHire,
  listAvailableDriversForImmediateBooking,
} from '@/modules/booking/application/driver-hire-availability-service';
import { toErrorResponse } from '@/shared/errors/app-error';

const querySchema = z.object({
  bookingType: z.nativeEnum(BookingType),
  hireDurationMinutes: z.coerce.number().int().min(1).max(525_600).optional(),
  hireStartAt: z.string().datetime().optional(),
  vehicleCategoryId: z.string().optional(),
  pickupLatitude: z.coerce.number().min(-90).max(90).optional(),
  pickupLongitude: z.coerce.number().min(-180).max(180).optional(),
});

/**
 * Browsable list of currently available drivers for a booking:
 * - DAILY/WEEKLY/MONTHLY: active, non-conflicting drivers who have set
 *   their own rate for that hire type — required reading before the
 *   customer can select a driver (see booking-service.ts's required-
 *   selection validation).
 * - POINT_TO_POINT/HOURLY: active, non-conflicting drivers near the pickup
 *   location, priced at the platform-standard rate — purely optional; the
 *   customer can pick one as a soft preference or skip this and let normal
 *   auto-dispatch matching find a driver.
 * - Anything else: empty list (no browsable selection for that type).
 */
export const GET = withPermission(PERMISSIONS.BOOKINGS_CREATE, async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const parsed = querySchema.parse({
      bookingType: url.searchParams.get('bookingType'),
      hireDurationMinutes: url.searchParams.get('hireDurationMinutes') ?? undefined,
      hireStartAt: url.searchParams.get('hireStartAt') ?? undefined,
      vehicleCategoryId: url.searchParams.get('vehicleCategoryId') ?? undefined,
      pickupLatitude: url.searchParams.get('pickupLatitude') ?? undefined,
      pickupLongitude: url.searchParams.get('pickupLongitude') ?? undefined,
    });

    if (isRateSelectableHireBooking(parsed.bookingType)) {
      if (parsed.hireDurationMinutes == null) {
        return NextResponse.json(
          { error: 'INVALID_INPUT', message: 'hireDurationMinutes is required.' },
          { status: 400 },
        );
      }
      const hireStartAt = parsed.hireStartAt ? new Date(parsed.hireStartAt) : new Date();
      const hireEndAt = calculateHireEndTimestamp(
        parsed.bookingType,
        parsed.hireDurationMinutes,
        hireStartAt,
      );

      const drivers = await listActiveDriversForHire(
        parsed.bookingType,
        hireStartAt,
        hireEndAt,
        parsed.vehicleCategoryId,
      );

      return NextResponse.json({ drivers }, { status: 200 });
    }

    if (
      parsed.bookingType === BookingType.POINT_TO_POINT ||
      parsed.bookingType === BookingType.HOURLY
    ) {
      const pickup =
        parsed.pickupLatitude != null && parsed.pickupLongitude != null
          ? { latitude: parsed.pickupLatitude, longitude: parsed.pickupLongitude }
          : null;

      const drivers = await listAvailableDriversForImmediateBooking(
        parsed.bookingType,
        pickup,
        parsed.vehicleCategoryId,
        parsed.hireDurationMinutes,
      );

      return NextResponse.json({ drivers }, { status: 200 });
    }

    return NextResponse.json({ drivers: [] }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Invalid request.', issues: err.issues },
        { status: 400 },
      );
    }
    return toErrorResponse(err, req.nextUrl.pathname);
  }
});
