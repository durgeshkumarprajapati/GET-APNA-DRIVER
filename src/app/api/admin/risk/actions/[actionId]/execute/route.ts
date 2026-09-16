import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { RiskActionService } from '@/modules/risk';

export const POST = withPermission(
  PERMISSIONS.ADMIN_RISK_ACTION,
  async (req: NextRequest, _context, routeContext?: { params: Promise<{ actionId: string }> }) => {
    try {
      if (!routeContext) {
        return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
      }
      const { actionId } = await routeContext.params;
      const body = await req.json().catch(() => ({}));

      if (!body.riskId) {
        return NextResponse.json(
          { success: false, error: 'Missing required field: riskId' },
          { status: 400 },
        );
      }

      const result = await RiskActionService.executeAction({
        riskId: body.riskId,
        actionId,
        operatorId: body.operatorId || 'op_admin',
        notes: body.notes,
      });

      return NextResponse.json({
        success: true,
        result,
      });
    } catch (err: unknown) {
      return NextResponse.json(
        {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to execute risk action',
        },
        { status: 500 },
      );
    }
  },
);
