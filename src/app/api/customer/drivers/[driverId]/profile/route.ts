import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BookingType } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getDriverPortfolio } from '@/modules/review/application/driver-portfolio-service';
import { peekDriverHireRate } from '@/modules/booking/application/driver-hire-availability-service';
import { isRateSelectableHireBooking } from '@/modules/booking/domain/booking-policy';
import { AppError } from '@/shared/errors/app-error';

type RouteParams = { params: Promise<{ driverId: string }> };

const querySchema = z.object({
  bookingType: z.nativeEnum(BookingType).optional(),
});

/**
 * Curated, privacy-safe driver profile for a customer reviewing a specific
 * driver before selecting them for a DAILY/WEEKLY/MONTHLY hire — reuses the
 * same portfolio data the driver's own public-portfolio page shows
 * (bio, experience, rating breakdown, recent reviews), but explicitly never
 * forwards driver-portfolio-service.ts's financial fields
 * (averageTripValue, totalEarnings) or cancellation-rate framing, which are
 * the driver's own business data, not something to show a customer picking
 * between drivers.
 */
export const GET = withPermission<RouteParams>(
  PERMISSIONS.BOOKINGS_CREATE,
  async (req: NextRequest, _ctx, routeContext) => {
    try {
      const { driverId } = await routeContext!.params;
      const url = new URL(req.url);
      const parsed = querySchema.parse({
        bookingType: url.searchParams.get('bookingType') ?? undefined,
      });

      const portfolio = await getDriverPortfolio(driverId);

      const rate =
        parsed.bookingType && isRateSelectableHireBooking(parsed.bookingType)
          ? await peekDriverHireRate(driverId, parsed.bookingType)
          : null;

      return NextResponse.json(
        {
          profile: {
            driverProfileId: portfolio.driverProfileId,
            displayName: portfolio.displayName,
            profileImageUrl: portfolio.profileImageUrl,
            bio: portfolio.bio,
            drivingExperienceYears: portfolio.drivingExperienceYears,
            primaryServiceArea: portfolio.primaryServiceArea,
            memberSince: portfolio.memberSince,
            averageRating: portfolio.performance.averageRating,
            totalReviews: portfolio.performance.totalReviews,
            ratingDistribution: portfolio.performance.ratingDistribution,
            completedTrips: portfolio.performance.completedTrips,
            completionRate: portfolio.performance.completionRate,
            recentReviews: portfolio.recentReviews,
            rate,
          },
        },
        { status: 200 },
      );
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'INVALID_INPUT', message: 'Invalid request.', issues: err.issues },
          { status: 400 },
        );
      }
      if (err instanceof AppError) {
        return NextResponse.json(
          { error: err.code, message: err.message },
          { status: err.statusCode },
        );
      }
      const message = err instanceof Error ? err.message : 'Failed to load driver profile.';
      return NextResponse.json({ error: 'DRIVER_PROFILE_FETCH_FAILED', message }, { status: 500 });
    }
  },
);
