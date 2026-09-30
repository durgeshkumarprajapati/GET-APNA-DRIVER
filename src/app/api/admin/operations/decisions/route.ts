import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { evaluateOperationsDecisions, listOperationsDecisions } from '@/modules/operations';
import type {
  OperationsDecisionStatus,
  OperationsSeverity,
  OperationsDecisionType,
} from '@/modules/operations';
import { logger } from '@/shared/logging/logger';

export const GET = withPermission(PERMISSIONS.ADMIN_OPERATIONS_READ, async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const severityFilter = searchParams.get('severity');
    const statusFilter = searchParams.get('status');
    const typeFilter = searchParams.get('decisionType') || searchParams.get('type');
    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('pageSize') || searchParams.get('limit') || 50);

    // Refresh first — this is what actually runs the deterministic rule
    // engine and durably upserts anything newly detected — then read the
    // full persisted history (including RESOLVED/DISMISSED rows) so the
    // status filter genuinely works instead of only ever matching
    // freshly-detected rows, as it did before persistence existed.
    await evaluateOperationsDecisions();

    const result = await listOperationsDecisions({
      status:
        statusFilter && statusFilter !== 'ALL'
          ? (statusFilter as OperationsDecisionStatus)
          : undefined,
      severity:
        severityFilter && severityFilter !== 'ALL'
          ? (severityFilter as OperationsSeverity)
          : undefined,
      decisionType:
        typeFilter && typeFilter !== 'ALL' ? (typeFilter as OperationsDecisionType) : undefined,
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      decisions: result.decisions,
      data: result.decisions,
      totalCount: result.total,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: Math.max(1, Math.ceil(result.total / result.pageSize)),
      },
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
