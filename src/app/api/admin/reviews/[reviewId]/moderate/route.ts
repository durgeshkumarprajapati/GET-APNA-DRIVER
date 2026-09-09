import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ReviewStatus } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { moderateReview } from '@/modules/review/application/review-service';
import {
  InvalidReviewModerationTransitionError,
  ReviewNotFoundError,
} from '@/modules/review/domain/errors';
import { toErrorResponse } from '@/shared/errors/app-error';

type RouteParams = { params: Promise<{ reviewId: string }> };

const moderateSchema = z.object({
  targetStatus: z.enum([
    ReviewStatus.PUBLISHED,
    ReviewStatus.FLAGGED,
    ReviewStatus.HIDDEN,
    ReviewStatus.REJECTED,
  ]),
  reason: z.string().trim().min(1),
});

export const POST = withPermission<RouteParams>(
  PERMISSIONS.REVIEWS_MANAGE,
  async (req, { principal }, routeContext) => {
    const { reviewId } = await routeContext!.params;

    try {
      const body = await req.json();
      const parsed = moderateSchema.parse(body);

      const review = await moderateReview({
        reviewId,
        actor: principal,
        targetStatus: parsed.targetStatus,
        reason: parsed.reason,
      });

      return NextResponse.json({ review }, { status: 200 });
    } catch (err: unknown) {
      if (err instanceof ReviewNotFoundError) {
        return NextResponse.json(
          { error: 'REVIEW_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      if (err instanceof InvalidReviewModerationTransitionError) {
        return NextResponse.json(
          { error: 'INVALID_MODERATION_TRANSITION', message: err.message },
          { status: 409 },
        );
      }
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
