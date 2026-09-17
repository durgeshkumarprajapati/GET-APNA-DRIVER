import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BookingType } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { calculateEstimatedFare } from '@/modules/pricing/application/fare-calculation-service';
import { evaluateEligiblePromotions } from '@/modules/promotion/application/services/promotion-eligibility-service';

const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const estimateSchema = z.object({
  bookingType: z.nativeEnum(BookingType).optional(),
  pickup: coordinatesSchema,
  dropoff: coordinatesSchema.nullable().optional(),
  estimatedDurationMinutes: z.number().int().min(0).max(525_600).nullable().optional(),
  hireDurationMinutes: z.number().int().min(1).max(525_600).nullable().optional(),
  numberOfDays: z.number().int().min(1).max(365).nullable().optional(),
  numberOfWeeks: z.number().int().min(1).max(52).nullable().optional(),
  numberOfMonths: z.number().int().min(1).max(12).nullable().optional(),
  hourlyPackageHours: z.number().int().min(1).max(24).nullable().optional(),
});

export const POST = withPermission(PERMISSIONS.BOOKINGS_CREATE, async (req, { principal }) => {
  try {
    const body = await req.json();
    const parsed = estimateSchema.parse(body);

    const estimate = await calculateEstimatedFare({
      bookingType: parsed.bookingType ?? BookingType.POINT_TO_POINT,
      pickup: parsed.pickup,
      dropoff: parsed.dropoff ?? null,
      estimatedDurationMinutes: parsed.estimatedDurationMinutes,
      hireDurationMinutes: parsed.hireDurationMinutes,
      numberOfDays: parsed.numberOfDays,
      numberOfWeeks: parsed.numberOfWeeks,
      numberOfMonths: parsed.numberOfMonths,
      hourlyPackageHours: parsed.hourlyPackageHours,
    });

    // Advisory only — the booking-creation flow re-validates and re-computes
    // the discount from scratch server-side; nothing here is ever trusted
    // back from the client.
    const eligiblePromotions = await evaluateEligiblePromotions(
      principal.userId,
      estimate.breakdown.totalFareAmount,
    );

    return NextResponse.json({ estimate, eligiblePromotions }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'INVALID_INPUT',
          message: 'Invalid pricing estimate request.',
          issues: err.issues,
        },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to calculate fare estimate.';
    return NextResponse.json({ error: 'PRICING_ESTIMATE_FAILED', message }, { status: 400 });
  }
});
