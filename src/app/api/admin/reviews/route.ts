import 'server-only';
import { NextResponse } from 'next/server';
import { ReviewStatus } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listAdminReviews } from '@/modules/review/application/review-service';

function parseStatus(value: string | null): ReviewStatus | undefined {
  if (value && Object.values(ReviewStatus).includes(value as ReviewStatus)) {
    return value as ReviewStatus;
  }
  return undefined;
}

export const GET = withPermission(PERMISSIONS.REVIEWS_MANAGE, async (req) => {
  const searchParams = req.nextUrl.searchParams;

  const result = await listAdminReviews({
    status: parseStatus(searchParams.get('status')),
    minRating: Number(searchParams.get('minRating')) || undefined,
    maxRating: Number(searchParams.get('maxRating')) || undefined,
    driverProfileId: searchParams.get('driverProfileId') || undefined,
    customerId: searchParams.get('customerId') || undefined,
    search: searchParams.get('search') || undefined,
    page: Number(searchParams.get('page')) || undefined,
    pageSize: Number(searchParams.get('pageSize')) || undefined,
  });

  return NextResponse.json(result, { status: 200 });
});
