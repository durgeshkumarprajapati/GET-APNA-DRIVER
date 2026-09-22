import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { driverScheduleService } from '@/modules/driver/application/services/driver-schedule-service';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { isDriverDispatchEligible } from '@/modules/driver/application/services/driver-eligibility-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withPermission(PERMISSIONS.DRIVER_SCHEDULE_READ, async (_req, { principal }) => {
  try {
    const profile = await getOrCreateDriverProfile(principal.userId);
    const overview = await driverScheduleService.getDriverSchedule(profile.id);
    const isWithinSchedule = await driverScheduleService.isDriverWithinSchedule(profile.id);
    const dispatchEligibility = await isDriverDispatchEligible(profile.id);

    return NextResponse.json({
      success: true,
      data: {
        todayShift: overview.todayShift,
        availabilityStatus: profile.availabilityStatus,
        isWithinSchedule,
        isDispatchEligible: dispatchEligibility.isEligible,
        eligibilityReasons: dispatchEligibility.reasons,
      },
    });
  } catch (err: unknown) {
    return toErrorResponse(err, _req.nextUrl.pathname);
  }
});
