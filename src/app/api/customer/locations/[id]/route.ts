import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import {
  getSavedLocationById,
  updateSavedLocation,
  deleteSavedLocation,
} from '@/modules/location/application/saved-location-service';

const updateLocationSchema = z.object({
  label: z.string().min(1).optional(),
  addressLine1: z.string().min(1).optional(),
  addressLine2: z.string().nullable().optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  country: z.string().optional(),
  postalCode: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const GET = withAuth<RouteParams>(async (_req, { principal }, routeContext) => {
  const { id } = await routeContext!.params;
  const location = await getSavedLocationById(principal.userId, id);

  if (!location) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Location with ID '${id}' not found.` } },
      { status: 404 },
    );
  }

  return NextResponse.json({ location }, { status: 200 });
});

export const PUT = withAuth<RouteParams>(async (req, { principal }, routeContext) => {
  const { id } = await routeContext!.params;
  const body = await req.json();
  const parsed = updateLocationSchema.parse(body);

  const updated = await updateSavedLocation(principal.userId, id, parsed, {
    ipAddress: req.headers.get('x-forwarded-for'),
  });

  return NextResponse.json({ location: updated }, { status: 200 });
});

export const DELETE = withAuth<RouteParams>(async (req, { principal }, routeContext) => {
  const { id } = await routeContext!.params;

  await deleteSavedLocation(principal.userId, id, {
    ipAddress: req.headers.get('x-forwarded-for'),
  });

  return NextResponse.json({ success: true }, { status: 200 });
});
