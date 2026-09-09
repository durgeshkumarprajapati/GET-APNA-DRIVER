import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { LocationSource } from '@prisma/client';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import {
  updateCustomerCurrentLocation,
  getCustomerCurrentLocation,
} from '@/modules/location/application/customer-location-service';

const customerLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nullable().optional(),
  address: z.string().nullable().optional(),
  source: z.nativeEnum(LocationSource).optional(),
});

export const GET = withAuth(async (_req, { principal }) => {
  const currentLocation = await getCustomerCurrentLocation(principal.userId);
  return NextResponse.json({ currentLocation }, { status: 200 });
});

export const POST = withAuth(async (req, { principal }) => {
  const body = await req.json();
  const parsed = customerLocationSchema.parse(body);

  const currentLocation = await updateCustomerCurrentLocation(principal.userId, parsed);

  return NextResponse.json({ currentLocation }, { status: 200 });
});
