import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { RiskDecisionService, RiskExplanationService } from '@/modules/risk';

export const GET = withPermission(
  PERMISSIONS.ADMIN_RISK_READ,
  async (_req: NextRequest, _context, routeContext?: { params: Promise<{ riskId: string }> }) => {
    try {
      if (!routeContext) {
        return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
      }
      const { riskId } = await routeContext.params;
      const decision = RiskDecisionService.getDecisionById(riskId);

      if (!decision) {
        return NextResponse.json(
          { success: false, error: `Risk decision '${riskId}' not found.` },
          { status: 404 },
        );
      }

      const explanation = RiskExplanationService.explainDecision(decision);

      return NextResponse.json({ success: true, decision, explanation });
    } catch (err: unknown) {
      return NextResponse.json(
        {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to fetch risk decision detail',
        },
        { status: 500 },
      );
    }
  },
);
