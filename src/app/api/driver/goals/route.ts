import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import {
  getDriverGoal,
  updateDriverGoal,
} from '@/modules/incentive/application/services/driver-goal-service';

export const GET = withPermission(
  PERMISSIONS.DRIVER_INCENTIVES_READ,
  async (_req, { principal }) => {
    const profile = await getOrCreateDriverProfile(principal.userId);
    const goal = await getDriverGoal(profile.id);
    return NextResponse.json({ success: true, data: goal }, { status: 200 });
  },
);

export const POST = withPermission(PERMISSIONS.DRIVER_GOALS_MANAGE, async (req, { principal }) => {
  const profile = await getOrCreateDriverProfile(principal.userId);
  const body = await req.json();
  const goal = await updateDriverGoal(profile.id, body);
  return NextResponse.json({ success: true, data: goal }, { status: 200 });
});
