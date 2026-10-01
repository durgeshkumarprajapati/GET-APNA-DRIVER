import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getCorporateExpenseSummary } from '@/modules/corporate/application/corporate-family-service';

export const GET = withPermission(
  PERMISSIONS.CORPORATE_REPORTS_READ,
  async (req) => {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId') || searchParams.get('organizationId');

    if (!orgId) {
      return NextResponse.json({ error: 'Missing organizationId query parameter' }, { status: 400 });
    }

    const summary = await getCorporateExpenseSummary(orgId);
    return NextResponse.json(summary, { status: 200 });
  },
);
