import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { RiskDecisionService } from '@/modules/risk';

export const GET = withPermission(PERMISSIONS.ADMIN_RISK_READ, async () => {
  try {
    const summary = RiskDecisionService.getOverviewSummary();
    return NextResponse.json({ success: true, summary });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch risk overview summary',
      },
      { status: 500 },
    );
  }
});
