import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getUserActiveOrganization } from '@/modules/corporate/domain/organization-service';
import { getCorporateExpenseSummary } from '@/modules/corporate/application/corporate-family-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withPermission(
  PERMISSIONS.CORPORATE_REPORTS_READ,
  async (req, { principal }) => {
    try {
      // The organization is derived from the caller's own membership, never
      // from a client-supplied orgId — otherwise any member of any
      // organization could read another organization's expense data.
      const membership = await getUserActiveOrganization(principal.userId);
      if (!membership) {
        return NextResponse.json({ error: 'Corporate organization not found' }, { status: 404 });
      }

      const summary = await getCorporateExpenseSummary(membership.organizationId);
      return NextResponse.json(summary, { status: 200 });
    } catch (error: unknown) {
      return toErrorResponse(error, req.nextUrl.pathname);
    }
  },
);
