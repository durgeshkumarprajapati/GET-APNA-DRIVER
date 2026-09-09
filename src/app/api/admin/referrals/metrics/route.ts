import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getReferralProgramMetrics } from '@/modules/identity/application/services/referral-service';

export const GET = withPermission(PERMISSIONS.PROMOTIONS_MANAGE, async () => {
  const metrics = await getReferralProgramMetrics();
  return NextResponse.json({ metrics }, { status: 200 });
});
