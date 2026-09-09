import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import {
  listSavedLocations,
  createSavedLocation,
} from '@/modules/location/application/saved-location-service';

const createLocationSchema = z.object({
  label: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().nullable().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().optional(),
  postalCode: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isDefault: z.boolean().optional(),
});

export const GET = withAuth(async (_req, { principal }) => {
  const locations = await listSavedLocations(principal.userId);
  return NextResponse.json({ locations }, { status: 200 });
});

export const POST = withAuth(async (req, { principal }) => {
  const body = await req.json();
  const parsed = createLocationSchema.parse(body);

  const created = await createSavedLocation(principal.userId, parsed, {
    ipAddress: req.headers.get('x-forwarded-for'),
  });

  return NextResponse.json({ location: created }, { status: 201 });
});
