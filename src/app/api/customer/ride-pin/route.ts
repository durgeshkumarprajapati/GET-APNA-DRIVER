import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  getCustomerPinStatus,
  setCustomerRidePin,
  InvalidRidePinFormatError,
} from '@/modules/customer/application/services/ride-pin-service';

const setPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 numeric digits'),
});

export const GET = withPermission(PERMISSIONS.USERS_PROFILE_READ, async (_req, { principal }) => {
  const status = await getCustomerPinStatus(principal.userId);
  return NextResponse.json({ status }, { status: 200 });
});

export const POST = withPermission(PERMISSIONS.USERS_PROFILE_UPDATE, async (req, { principal }) => {
  try {
    const body = await req.json();
    const parsed = setPinSchema.parse(body);

    const status = await setCustomerRidePin(principal.userId, parsed.pin);

    return NextResponse.json(
      {
        success: true,
        status,
        message: 'Your 6-digit Ride PIN has been updated successfully.',
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    if (err instanceof InvalidRidePinFormatError) {
      return NextResponse.json(
        { error: 'INVALID_PIN_FORMAT', message: err.message },
        { status: 400 },
      );
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: err.issues[0]?.message ?? 'Invalid request body' },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to set Ride PIN.';
    return NextResponse.json({ error: 'RIDE_PIN_UPDATE_FAILED', message }, { status: 500 });
  }
});
