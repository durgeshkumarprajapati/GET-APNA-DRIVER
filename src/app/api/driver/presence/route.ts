import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DriverAvailabilityStatus } from '@prisma/client';
import { withRole } from '@/modules/identity/authorization/route-guard';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import { prisma } from '@/shared/database/prisma';
import {
  setDriverAvailability,
  getDriverAvailability,
} from '@/modules/driver/application/services/driver-availability-service';
import { classifyLocationFreshness } from '@/modules/dispatch/application/candidate-ranking-service';
import { DriverNotEligibleError } from '@/modules/driver/domain/errors';

const presenceSchema = z.object({
  status: z.nativeEnum(DriverAvailabilityStatus),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracy: z.number().min(0).optional(),
});

export const GET = withRole(SYSTEM_ROLE_CODES.DRIVER, async (_req, { principal }) => {
  const availability = await getDriverAvailability(principal.userId);
  const profile = await prisma.driverProfile.findUnique({
    where: { userId: principal.userId },
    include: { currentLocation: true },
  });

  const currentLocation = profile?.currentLocation;
  const now = new Date();
  const freshness = currentLocation ? classifyLocationFreshness(currentLocation.capturedAt, now) : 'UNAVAILABLE';

  return NextResponse.json(
    {
      availabilityStatus: availability.availabilityStatus,
      isEligible: availability.isEligible,
      reasons: availability.reasons,
      currentLocation: currentLocation
        ? {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            accuracy: currentLocation.accuracy,
            capturedAt: currentLocation.capturedAt.toISOString(),
            freshness,
          }
        : null,
    },
    { status: 200 },
  );
});

export const POST = withRole(SYSTEM_ROLE_CODES.DRIVER, async (req, { principal }) => {
  try {
    const body = await req.json();
    const parsed = presenceSchema.parse(body);

    const profile = await setDriverAvailability(
      principal.userId,
      parsed.status,
      {
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        accuracy: parsed.accuracy,
        ipAddress: req.headers.get('x-forwarded-for'),
      },
    );

    return NextResponse.json({ success: true, profile }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof DriverNotEligibleError) {
      return NextResponse.json(
        {
          success: false,
          error: err.message,
          reasons: err.reasons,
          errorCode: 'DRIVER_NOT_ELIGIBLE',
        },
        { status: 403 },
      );
    }
    throw err;
  }
});
