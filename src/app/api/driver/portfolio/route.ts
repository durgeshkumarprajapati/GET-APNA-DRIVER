import 'server-only';
import { NextResponse } from 'next/server';
import { withRole } from '@/modules/identity/authorization/route-guard';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { getDriverPortfolio } from '@/modules/review/application/driver-portfolio-service';

// USERS_PROFILE_READ is shared with CUSTOMER (for /profile), so it cannot be
// used to gate this driver-only self-preview — a plain customer account
// would otherwise pass the permission check and auto-vivify an empty
// DriverProfile for themselves. Role-gated instead.
export const GET = withRole(SYSTEM_ROLE_CODES.DRIVER, async (_req, { principal }) => {
  const profile = await getOrCreateDriverProfile(principal.userId);
  const portfolio = await getDriverPortfolio(profile.id);
  return NextResponse.json({ portfolio }, { status: 200 });
});
