import 'server-only';
import { NextResponse } from 'next/server';
import {
  DriverApprovalStatus,
  DriverOnboardingStatus,
  DriverVerificationStatus,
} from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listDriverApplications } from '@/modules/driver/application/services/driver-onboarding-service';

export const GET = withPermission(PERMISSIONS.ADMIN_DRIVER_READ, async (req) => {
  const { searchParams } = new URL(req.url);
  const onboardingStatus = searchParams.get('onboardingStatus') as DriverOnboardingStatus | null;
  const approvalStatus = searchParams.get('approvalStatus') as DriverApprovalStatus | null;
  const verificationStatus = searchParams.get(
    'verificationStatus',
  ) as DriverVerificationStatus | null;

  const drivers = await listDriverApplications({
    ...(onboardingStatus ? { onboardingStatus } : {}),
    ...(approvalStatus ? { approvalStatus } : {}),
    ...(verificationStatus ? { verificationStatus } : {}),
  });

  return NextResponse.json({ drivers }, { status: 200 });
});
