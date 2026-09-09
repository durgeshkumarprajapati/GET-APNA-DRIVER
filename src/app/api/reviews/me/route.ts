import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listOwnCustomerReviews } from '@/modules/review/application/review-service';

export const GET = withPermission(PERMISSIONS.REVIEWS_READ, async (req, { principal }) => {
  const searchParams = req.nextUrl.searchParams;
  const page = Number(searchParams.get('page')) || undefined;
  const pageSize = Number(searchParams.get('pageSize')) || undefined;

  const result = await listOwnCustomerReviews(principal.userId, { page, pageSize });
  return NextResponse.json(result, { status: 200 });
});
