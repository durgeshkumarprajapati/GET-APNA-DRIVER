import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { updateOperationsDecisionStatus } from '@/modules/operations';

export const POST = withPermission(
  PERMISSIONS.ADMIN_OPERATIONS_MANAGE,
  async (
    _req: NextRequest,
    context,
    routeContext?: { params: Promise<{ decisionId: string }> },
  ) => {
    try {
      if (!routeContext) {
        return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
      }
      const { decisionId } = await routeContext.params;
      const updated = await updateOperationsDecisionStatus(
        decisionId,
        'ACKNOWLEDGED',
        context.principal.userId,
      );

      if (!updated) {
        return NextResponse.json(
          { success: false, error: 'Operational decision not found' },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, decision: updated });
    } catch (err: unknown) {
      return NextResponse.json(
        {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to acknowledge decision',
        },
        { status: 500 },
      );
    }
  },
);
