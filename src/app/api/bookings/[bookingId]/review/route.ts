import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { createReview, getReviewForBooking } from '@/modules/review/application/review-service';
import {
  BookingNotEligibleForReviewError,
  DuplicateReviewError,
} from '@/modules/review/domain/errors';
import { BookingNotFoundError } from '@/modules/booking/domain/errors';
import { toErrorResponse } from '@/shared/errors/app-error';

type RouteParams = { params: Promise<{ bookingId: string }> };

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).nullable().optional(),
});

export const POST = withPermission<RouteParams>(
  PERMISSIONS.REVIEWS_CREATE,
  async (req, { principal }, routeContext) => {
    const { bookingId } = await routeContext!.params;

    try {
      const body = await req.json();
      const parsed = createReviewSchema.parse(body);

      const review = await createReview({
        bookingId,
        customerUserId: principal.userId,
        rating: parsed.rating,
        comment: parsed.comment,
      });

      return NextResponse.json({ review }, { status: 201 });
    } catch (err: unknown) {
      if (err instanceof BookingNotFoundError) {
        return NextResponse.json(
          { error: 'BOOKING_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      if (err instanceof BookingNotEligibleForReviewError) {
        return NextResponse.json(
          { error: 'BOOKING_NOT_ELIGIBLE_FOR_REVIEW', message: err.message },
          { status: 409 },
        );
      }
      if (err instanceof DuplicateReviewError) {
        return NextResponse.json(
          { error: 'DUPLICATE_REVIEW', message: err.message },
          { status: 409 },
        );
      }
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);

export const GET = withPermission<RouteParams>(
  PERMISSIONS.REVIEWS_READ,
  async (req, { principal }, routeContext) => {
    const { bookingId } = await routeContext!.params;

    try {
      const review = await getReviewForBooking(principal.userId, bookingId);
      return NextResponse.json({ review }, { status: 200 });
    } catch (err: unknown) {
      if (err instanceof BookingNotFoundError) {
        return NextResponse.json(
          { error: 'BOOKING_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
