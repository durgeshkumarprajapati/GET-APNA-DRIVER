import 'server-only';
import { NextResponse } from 'next/server';
import { withRole } from '@/modules/identity/authorization/route-guard';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { listDriverReviews } from '@/modules/review/application/review-service';

// REVIEWS_READ is shared with CUSTOMER (for /customer/reviews), so it cannot
// gate this driver-only endpoint — role-gated instead, matching
// /api/driver/portfolio.
export const GET = withRole(SYSTEM_ROLE_CODES.DRIVER, async (req, { principal }) => {
  const profile = await getOrCreateDriverProfile(principal.userId);

  const searchParams = req.nextUrl.searchParams;
  const page = Number(searchParams.get('page')) || undefined;
  const pageSize = Number(searchParams.get('pageSize')) || undefined;
  const minRating = Number(searchParams.get('minRating')) || undefined;

  const result = await listDriverReviews(profile.id, { page, pageSize, minRating });
  return NextResponse.json(result, { status: 200 });
});
