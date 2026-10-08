import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getCustomerBookingUX3Defaults } from '@/modules/booking/application/services/customer-booking-ux3-service';

export const GET = withPermission(PERMISSIONS.BOOKINGS_READ, async (_req, { principal }) => {
  const defaults = await getCustomerBookingUX3Defaults(principal.userId);
  return NextResponse.json(defaults, { status: 200 });
});
