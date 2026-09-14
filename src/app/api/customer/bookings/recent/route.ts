import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listRecentCompletedBookings } from '@/modules/booking/application/booking-service';

export const GET = withPermission(PERMISSIONS.BOOKINGS_READ, async (_req, { principal }) => {
  try {
    const bookings = await listRecentCompletedBookings(principal.userId);
    return NextResponse.json({ bookings }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch recent bookings.';
    return NextResponse.json({ error: 'FETCH_RECENT_BOOKINGS_FAILED', message }, { status: 500 });
  }
});
