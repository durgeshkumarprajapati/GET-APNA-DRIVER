import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { RiskDecisionService, RiskDecisionStatus, RiskSubjectType } from '@/modules/risk';
import { logger } from '@/shared/logging/logger';

export const GET = withPermission(PERMISSIONS.ADMIN_RISK_READ, async (req: NextRequest) => {
  try {
    RiskDecisionService.ensureInitialSeed();
    const { searchParams } = new URL(req.url);
    const subjectParam = searchParams.get('subjectType');
    const subjectType =
      subjectParam && subjectParam !== 'ALL' ? (subjectParam as RiskSubjectType) : undefined;

    const statusParam = searchParams.get('status');
    const status =
      statusParam && statusParam !== 'ALL' ? (statusParam as RiskDecisionStatus) : undefined;

    const minScoreStr = searchParams.get('minScore');
    const minScore = minScoreStr ? parseInt(minScoreStr, 10) : undefined;
    const search = searchParams.get('search') || undefined;

    const decisions = RiskDecisionService.getAllDecisions({
      subjectType,
      status,
      minScore,
      search,
    });

    return NextResponse.json({
      success: true,
      count: decisions.length,
      decisions,
      data: decisions,
    });
  } catch (err: unknown) {
    logger.error({ err }, 'Failed to fetch risk decisions');
    return NextResponse.json({
      success: true,
      count: 0,
      decisions: [],
      data: [],
    });
  }
});
