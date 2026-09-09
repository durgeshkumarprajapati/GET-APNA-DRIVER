import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { findNearbyDrivers } from '@/modules/location/application/nearby-driver-service';

const nearbyQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().positive().optional(),
});

export const GET = withPermission(PERMISSIONS.LOCATION_NEARBY_READ, async (req) => {
  const { searchParams } = new URL(req.url);
  const parsed = nearbyQuerySchema.parse({
    latitude: searchParams.get('latitude'),
    longitude: searchParams.get('longitude'),
    radiusMeters: searchParams.get('radiusMeters') ?? undefined,
  });

  const drivers = await findNearbyDrivers(parsed);

  return NextResponse.json({ drivers }, { status: 200 });
});
