import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listDriverAssignmentOffers } from '@/modules/booking/application/assignment-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withPermission(
  PERMISSIONS.DRIVER_ASSIGNMENT_RESPOND,
  async (_req, { principal }) => {
    try {
      const offers = await listDriverAssignmentOffers(principal.userId);
      return NextResponse.json({ offers }, { status: 200 });
    } catch (err: unknown) {
      return toErrorResponse(err, _req.nextUrl.pathname);
    }
  },
);
