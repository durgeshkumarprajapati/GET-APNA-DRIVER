import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { prisma } from '@/shared/database/prisma';
import { getRecommendationsForCustomer } from '@/modules/recommendations/application/services/recommendation-service';

export const GET = withPermission(PERMISSIONS.RECOMMENDATIONS_READ, async (req, { principal }) => {
  const { searchParams } = new URL(req.url);
  const limitParam = parseInt(searchParams.get('limit') ?? '5', 10);
  const limit = Math.min(Math.max(isNaN(limitParam) ? 5 : limitParam, 1), 10);
  const bypassCache = searchParams.get('bypassCache') === 'true';

  const recommendations = await getRecommendationsForCustomer(
    { customerId: principal.userId },
    prisma,
    { limit, bypassCache },
  );

  return NextResponse.json({ success: true, data: recommendations }, { status: 200 });
});
