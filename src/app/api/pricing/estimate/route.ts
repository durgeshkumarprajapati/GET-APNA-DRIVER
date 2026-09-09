import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { calculateEstimatedFare } from '@/modules/pricing/application/fare-calculation-service';

export const POST = withPermission(PERMISSIONS.BOOKINGS_CREATE, async (req) => {
  try {
    const body = await req.json();

    if (
      !body.pickup ||
      typeof body.pickup.latitude !== 'number' ||
      typeof body.pickup.longitude !== 'number'
    ) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Valid pickup coordinates are required.' },
        { status: 400 },
      );
    }

    const estimate = await calculateEstimatedFare({
      bookingType: body.bookingType || 'ONE_WAY',
      pickup: body.pickup,
      dropoff: body.dropoff || null,
      estimatedDurationMinutes: body.estimatedDurationMinutes,
      numberOfDays: body.numberOfDays,
      hourlyPackageHours: body.hourlyPackageHours,
    });

    return NextResponse.json({ estimate }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to calculate fare estimate.';
    return NextResponse.json({ error: 'PRICING_ESTIMATE_FAILED', message }, { status: 400 });
  }
});
