import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { RiskDecisionService } from '@/modules/risk';
import { logger } from '@/shared/logging/logger';

export const GET = withPermission(PERMISSIONS.ADMIN_RISK_READ, async () => {
  try {
    RiskDecisionService.ensureInitialSeed();
    const summary = RiskDecisionService.getOverviewSummary();
    return NextResponse.json({ success: true, summary, data: summary });
  } catch (err: unknown) {
    logger.error({ err }, 'Failed to fetch risk overview summary');
    const fallbackSummary = RiskDecisionService.getOverviewSummary();
    return NextResponse.json({ success: true, summary: fallbackSummary, data: fallbackSummary });
  }
});
