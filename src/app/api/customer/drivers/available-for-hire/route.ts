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
import { listActiveDriversForHire } from '@/modules/booking/application/driver-hire-availability-service';

const querySchema = z.object({
  bookingType: z.nativeEnum(BookingType),
  hireDurationMinutes: z.coerce.number().int().min(1).max(525_600),
  hireStartAt: z.string().datetime().optional(),
  vehicleCategoryId: z.string().optional(),
});

/**
 * Browsable list of active, non-conflicting drivers (with their own rate)
 * for a DAILY/WEEKLY/MONTHLY hire window — required reading before a
 * customer can select a driver for those booking types (see
 * booking-service.ts's required-selection validation).
 */
export const GET = withPermission(PERMISSIONS.BOOKINGS_CREATE, async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const parsed = querySchema.parse({
      bookingType: url.searchParams.get('bookingType'),
      hireDurationMinutes: url.searchParams.get('hireDurationMinutes'),
      hireStartAt: url.searchParams.get('hireStartAt') ?? undefined,
      vehicleCategoryId: url.searchParams.get('vehicleCategoryId') ?? undefined,
    });

    if (!isRateSelectableHireBooking(parsed.bookingType)) {
      return NextResponse.json({ drivers: [] }, { status: 200 });
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
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Invalid request.', issues: err.issues },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to fetch available drivers.';
    return NextResponse.json({ error: 'FETCH_DRIVERS_FAILED', message }, { status: 500 });
  }
});
