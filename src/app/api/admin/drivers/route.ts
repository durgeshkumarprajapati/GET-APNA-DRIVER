import 'server-only';
import { NextResponse } from 'next/server';
import {
  DriverApprovalStatus,
  DriverAvailabilityStatus,
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
  const availabilityStatus = searchParams.get(
    'availabilityStatus',
  ) as DriverAvailabilityStatus | null;
  const search = searchParams.get('search');
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? '25');

  const result = await listDriverApplications({
    ...(onboardingStatus ? { onboardingStatus } : {}),
    ...(approvalStatus ? { approvalStatus } : {}),
    ...(verificationStatus ? { verificationStatus } : {}),
    ...(availabilityStatus ? { availabilityStatus } : {}),
    ...(search ? { search } : {}),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
  });

  return NextResponse.json(result, { status: 200 });
});
