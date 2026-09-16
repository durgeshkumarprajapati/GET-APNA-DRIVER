import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { evaluateOperationsDecisions } from '@/modules/operations';

export const GET = withPermission(
  PERMISSIONS.ADMIN_OPERATIONS_READ,
  async (req: NextRequest) => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const severityFilter = searchParams.get('severity');
      const statusFilter = searchParams.get('status');
      const typeFilter = searchParams.get('decisionType');

      let decisions = await evaluateOperationsDecisions();

      if (severityFilter) {
        decisions = decisions.filter((d) => d.severity === severityFilter);
      }
      if (statusFilter) {
        decisions = decisions.filter((d) => d.status === statusFilter);
      }
      if (typeFilter) {
        decisions = decisions.filter((d) => d.decisionType === typeFilter);
      }

      return NextResponse.json({
        success: true,
        decisions,
        totalCount: decisions.length,
      });
    } catch (err: unknown) {
      return NextResponse.json(
        {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to fetch operations decisions',
        },
        { status: 500 },
      );
    }
  },
);
