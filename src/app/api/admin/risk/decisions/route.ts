import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { RiskDecisionService, RiskDecisionStatus, RiskSubjectType } from '@/modules/risk';

export const GET = withPermission(PERMISSIONS.ADMIN_RISK_READ, async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const subjectType = (searchParams.get('subjectType') as RiskSubjectType) || undefined;
    const status = (searchParams.get('status') as RiskDecisionStatus) || undefined;
    const minScoreStr = searchParams.get('minScore');
    const minScore = minScoreStr ? parseInt(minScoreStr, 10) : undefined;
    const search = searchParams.get('search') || undefined;

    const decisions = RiskDecisionService.getAllDecisions({
      subjectType,
      status,
      minScore,
      search,
    });

    return NextResponse.json({ success: true, count: decisions.length, decisions });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch risk decisions',
      },
      { status: 500 },
    );
  }
});
