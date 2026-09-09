import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listDriverAssignmentOffers } from '@/modules/booking/application/assignment-service';

export const GET = withPermission(
  PERMISSIONS.DRIVER_ASSIGNMENT_RESPOND,
  async (_req, { principal }) => {
    try {
      const offers = await listDriverAssignmentOffers(principal.userId);
      return NextResponse.json({ offers }, { status: 200 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch assignment offers.';
      return NextResponse.json({ error: 'FETCH_OFFERS_FAILED', message }, { status: 500 });
    }
  },
);
