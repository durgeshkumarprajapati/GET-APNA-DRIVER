import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getServiceQualityTrustDetails } from '@/modules/customer/application/services/service-quality-trust-service';

export const GET = withPermission(PERMISSIONS.BOOKINGS_READ, async (req) => {
  const { searchParams } = new URL(req.url);
  const driverProfileId = searchParams.get('driverProfileId') || undefined;

  const details = await getServiceQualityTrustDetails(driverProfileId);
  return NextResponse.json(details, { status: 200 });
});
