import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getViralReferralHub } from '@/modules/identity/application/services/referral-growth3-service';

export const GET = withPermission(PERMISSIONS.PROMOTIONS_READ, async (_req, { principal }) => {
  const hub = await getViralReferralHub(principal.userId);
  return NextResponse.json(hub, { status: 200 });
});
