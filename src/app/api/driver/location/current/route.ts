import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { LocationSource } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { updateDriverLocation } from '@/modules/location/application/driver-location-service';

const driverLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nullable().optional(),
  heading: z.number().nullable().optional(),
  speed: z.number().nullable().optional(),
  source: z.nativeEnum(LocationSource).optional(),
  capturedAt: z.string().nullable().optional(),
});

export const PUT = withPermission(
  PERMISSIONS.LOCATION_DRIVER_UPDATE,
  async (req, { principal }) => {
    const body = await req.json();
    const parsed = driverLocationSchema.parse(body);

    const currentLocation = await updateDriverLocation(principal.userId, parsed, {
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ currentLocation }, { status: 200 });
  },
);
