import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getAdminReviewDetail } from '@/modules/review/application/review-service';
import { ReviewNotFoundError } from '@/modules/review/domain/errors';
import { toErrorResponse } from '@/shared/errors/app-error';

type RouteParams = { params: Promise<{ reviewId: string }> };

export const GET = withPermission<RouteParams>(
  PERMISSIONS.REVIEWS_MANAGE,
  async (req, _ctx, routeContext) => {
    const { reviewId } = await routeContext!.params;
    try {
      const review = await getAdminReviewDetail(reviewId);
      return NextResponse.json({ review }, { status: 200 });
    } catch (err: unknown) {
      if (err instanceof ReviewNotFoundError) {
        return NextResponse.json(
          { error: 'REVIEW_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
