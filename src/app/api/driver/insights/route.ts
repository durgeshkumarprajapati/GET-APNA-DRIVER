import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { getConsolidatedDriverInsights } from '@/modules/driver/application/services/driver-experience-insights-service';

export const GET = withPermission(
  PERMISSIONS.DRIVER_PERFORMANCE_READ,
  async (_req, { principal }) => {
    const profile = await getOrCreateDriverProfile(principal.userId);
    const insights = await getConsolidatedDriverInsights(profile.id);
    return NextResponse.json({ insights }, { status: 200 });
  },
);
