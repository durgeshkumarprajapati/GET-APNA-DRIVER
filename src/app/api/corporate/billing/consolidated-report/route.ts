import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { generateConsolidatedBillingReport } from '@/modules/corporate/application/corporate-family-service';

export const GET = withPermission(
  PERMISSIONS.CORPORATE_REPORTS_READ,
  async (req) => {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId') || searchParams.get('organizationId');
    const month = parseInt(searchParams.get('month') || `${new Date().getMonth() + 1}`, 10);
    const year = parseInt(searchParams.get('year') || `${new Date().getFullYear()}`, 10);

    if (!orgId) {
      return NextResponse.json({ error: 'Missing organizationId query parameter' }, { status: 400 });
    }

    const report = await generateConsolidatedBillingReport(orgId, month, year);
    return NextResponse.json(report, { status: 200 });
  },
);
