import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DriverAvailabilityStatus } from '@prisma/client';
import { withRole } from '@/modules/identity/authorization/route-guard';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import {
  getDriverAvailability,
  setDriverAvailability,
} from '@/modules/driver/application/services/driver-availability-service';

import { DriverNotEligibleError } from '@/modules/driver/domain/errors';

const setAvailabilitySchema = z.object({
  targetStatus: z.nativeEnum(DriverAvailabilityStatus),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracy: z.number().min(0).optional(),
});

export const GET = withRole(SYSTEM_ROLE_CODES.DRIVER, async (_req, { principal }) => {
  const result = await getDriverAvailability(principal.userId);
  return NextResponse.json(result, { status: 200 });
});

export const PUT = withRole(SYSTEM_ROLE_CODES.DRIVER, async (req, { principal }) => {
  try {
    const body = await req.json();
    const parsed = setAvailabilitySchema.parse(body);

    const profile = await setDriverAvailability(principal.userId, parsed.targetStatus, {
      ipAddress: req.headers.get('x-forwarded-for'),
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      accuracy: parsed.accuracy,
    });

    return NextResponse.json({ profile }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof DriverNotEligibleError) {
      return NextResponse.json(
        {
          success: false,
          error: err.message,
          errorCode: 'DRIVER_NOT_ELIGIBLE',
        },
        { status: 403 },
      );
    }
    throw err;
  }
});
