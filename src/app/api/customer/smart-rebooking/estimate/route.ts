import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { calculateUpfrontSummary } from '@/modules/booking/application/smart-rebooking-service';
import { toErrorResponse } from '@/shared/errors/app-error';
import { z } from 'zod';

const locationSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  label: z.string().nullable().optional(),
  latitude: z.number(),
  longitude: z.number(),
});

const estimateSchema = z.object({
  pickupLocation: locationSchema,
  dropoffLocation: locationSchema.nullable().optional(),
  bookingType: z.enum(['ONE_WAY', 'ROUND_TRIP', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY']).default('ONE_WAY'),
  vehicleCategory: z.string().optional().default('SEDAN'),
  savedPersonId: z.string().nullable().optional(),
  preferredDriverId: z.string().nullable().optional(),
});

export const POST = withPermission(PERMISSIONS.BOOKINGS_READ, async (req: NextRequest, { principal }) => {
  try {
    const body = await req.json();
    const parsed = estimateSchema.parse(body);

    const upfrontSummary = await calculateUpfrontSummary(principal.userId, parsed);

    return NextResponse.json({
      success: true,
      upfrontSummary,
    });
  } catch (err: unknown) {
    return toErrorResponse(err, req.nextUrl.pathname);
  }
});
