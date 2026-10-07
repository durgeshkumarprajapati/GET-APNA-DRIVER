import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getUserActiveOrganization } from '@/modules/corporate/domain/organization-service';
import { generateConsolidatedBillingReport } from '@/modules/corporate/application/corporate-family-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withPermission(
  PERMISSIONS.CORPORATE_REPORTS_READ,
  async (req, { principal }) => {
    try {
      // The organization is derived from the caller's own membership, never
      // from a client-supplied orgId — otherwise any member of any
      // organization could read another organization's billing report.
      const membership = await getUserActiveOrganization(principal.userId);
      if (!membership) {
        return NextResponse.json({ error: 'Corporate organization not found' }, { status: 404 });
      }

      const { searchParams } = new URL(req.url);
      const month = parseInt(searchParams.get('month') || `${new Date().getMonth() + 1}`, 10);
      const year = parseInt(searchParams.get('year') || `${new Date().getFullYear()}`, 10);

      const report = await generateConsolidatedBillingReport(
        membership.organizationId,
        month,
        year,
      );
      return NextResponse.json(report, { status: 200 });
    } catch (error: unknown) {
      return toErrorResponse(error, req.nextUrl.pathname);
    }
  },
);
