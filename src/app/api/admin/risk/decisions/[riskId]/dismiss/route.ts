import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { RiskDecisionService } from '@/modules/risk';
import { toErrorResponse } from '@/shared/errors/app-error';

export const POST = withPermission(
  PERMISSIONS.ADMIN_RISK_MANAGE,
  async (req: NextRequest, _context, routeContext?: { params: Promise<{ riskId: string }> }) => {
    try {
      if (!routeContext) {
        return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
      }
      const { riskId } = await routeContext.params;
      const body = await req.json().catch(() => ({}));
      const operatorId = body.operatorId || 'op_admin';

      const updated = await RiskDecisionService.updateStatus(riskId, 'DISMISSED', operatorId);

      if (!updated) {
        return NextResponse.json(
          { success: false, error: `Risk decision '${riskId}' not found.` },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        message: `Risk decision '${riskId}' dismissed.`,
        decision: updated,
      });
    } catch (err: unknown) {
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
