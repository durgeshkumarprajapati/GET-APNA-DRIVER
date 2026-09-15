import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getUserActiveOrganization } from '@/modules/corporate/domain/organization-service';
import { getCorporateSpendReport } from '@/modules/corporate/domain/corporate-reporting-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (req, { principal }) => {
  try {
    const membership = await getUserActiveOrganization(principal.userId);
    if (!membership) {
      return NextResponse.json({ error: 'Corporate organization not found' }, { status: 404 });
    }

    const report = await getCorporateSpendReport(membership.organizationId);

    return NextResponse.json({ report }, { status: 200 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
