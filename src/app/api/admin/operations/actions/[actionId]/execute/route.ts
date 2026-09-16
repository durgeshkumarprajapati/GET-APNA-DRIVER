import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { executeOperationsAction } from '@/modules/operations';

export const POST = withPermission(
  PERMISSIONS.ADMIN_OPERATIONS_ACTION,
  async (
    req: NextRequest,
    context,
    routeContext?: { params: Promise<{ actionId: string }> },
  ) => {
    try {
      if (!routeContext) {
        return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
      }
      const { actionId } = await routeContext.params;
      const body = await req.json();
      const { decisionId, actionType, bookingId, incidentId, driverId, reason } = body;

      if (!decisionId) {
        return NextResponse.json(
          { success: false, error: 'decisionId is required parameter' },
          { status: 400 },
        );
      }

      const result = await executeOperationsAction({
        actionId,
        decisionId,
        actionType,
        adminUserId: context.principal.userId,
        bookingId,
        incidentId,
        driverId,
        reason,
      });

      return NextResponse.json({ success: true, result });
    } catch (err: unknown) {
      return NextResponse.json(
        {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to execute operational action',
        },
        { status: 500 },
      );
    }
  },
);
