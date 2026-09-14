import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { getDriverEarningsSummary } from '@/modules/incentive/application/services/driver-earnings-service';

export const GET = withPermission(PERMISSIONS.DRIVER_INCENTIVES_READ, async (_req, { principal }) => {
  const profile = await getOrCreateDriverProfile(principal.userId);
  const summary = await getDriverEarningsSummary(profile.id);
  return NextResponse.json({ success: true, data: summary }, { status: 200 });
});
