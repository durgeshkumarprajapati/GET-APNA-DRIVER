import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { getDriverEngagementSummary } from '@/modules/driver-engagement/application/driver-engagement-service';

export const GET = withPermission(
  PERMISSIONS.DRIVER_ENGAGEMENT_READ,
  async (_req, { principal }) => {
    const profile = await getOrCreateDriverProfile(principal.userId);
    const summary = await getDriverEngagementSummary(profile.id);

    return NextResponse.json(
      {
        success: true,
        achievements: summary.activeProgress,
        recentUnlocks: summary.recentUnlocks,
        streak: summary.streak,
      },
      { status: 200 },
    );
  },
);
