import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { listDriverReviews } from '@/modules/review/application/review-service';

export const GET = withPermission(PERMISSIONS.REVIEWS_READ, async (req, { principal }) => {
  const profile = await getOrCreateDriverProfile(principal.userId);

  const searchParams = req.nextUrl.searchParams;
  const page = Number(searchParams.get('page')) || undefined;
  const pageSize = Number(searchParams.get('pageSize')) || undefined;
  const minRating = Number(searchParams.get('minRating')) || undefined;

  const result = await listDriverReviews(profile.id, { page, pageSize, minRating });
  return NextResponse.json(result, { status: 200 });
});
