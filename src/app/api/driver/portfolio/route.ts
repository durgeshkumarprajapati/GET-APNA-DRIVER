import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { getDriverPortfolio } from '@/modules/review/application/driver-portfolio-service';

export const GET = withPermission(PERMISSIONS.USERS_PROFILE_READ, async (_req, { principal }) => {
  const profile = await getOrCreateDriverProfile(principal.userId);
  const portfolio = await getDriverPortfolio(profile.id);
  return NextResponse.json({ portfolio }, { status: 200 });
});
