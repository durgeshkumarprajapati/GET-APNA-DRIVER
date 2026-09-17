import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { evaluateOperationsDecisions } from '@/modules/operations';
import { logger } from '@/shared/logging/logger';

export const GET = withPermission(PERMISSIONS.ADMIN_OPERATIONS_READ, async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const severityFilter = searchParams.get('severity');
    const statusFilter = searchParams.get('status');
    const typeFilter = searchParams.get('decisionType') || searchParams.get('type');

    let decisions = await evaluateOperationsDecisions();

    if (severityFilter && severityFilter !== 'ALL') {
      decisions = decisions.filter((d) => d.severity === severityFilter);
    }
    if (statusFilter && statusFilter !== 'ALL') {
      decisions = decisions.filter((d) => d.status === statusFilter);
    }
    if (typeFilter && typeFilter !== 'ALL') {
      decisions = decisions.filter((d) => d.decisionType === typeFilter);
    }

    return NextResponse.json({
      success: true,
      decisions,
      data: decisions,
      totalCount: decisions.length,
    });
  } catch (err: unknown) {
    logger.error({ err }, 'Failed to fetch operations decisions');
    return NextResponse.json({
      success: true,
      decisions: [],
      data: [],
      totalCount: 0,
    });
  }
});
