import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { acceptAssignmentOffer } from '@/modules/booking/application/assignment-service';
import {
  AssignmentAttemptNotFoundError,
  AssignmentOfferExpiredError,
  AssignmentAlreadyRespondedError,
  BookingAlreadyAssignedError,
} from '@/modules/booking/domain/errors';
import { DriverNotEligibleError } from '@/modules/driver/domain/errors';

type RouteParams = { params: Promise<{ attemptId: string }> };

export const POST = withPermission<RouteParams>(
  PERMISSIONS.DRIVER_ASSIGNMENT_RESPOND,
  async (_req, { principal }, routeContext) => {
    try {
      const { attemptId } = await routeContext!.params;
      await acceptAssignmentOffer(principal.userId, attemptId);
      return NextResponse.json(
        { message: 'Assignment offer accepted successfully.' },
        { status: 200 },
      );
    } catch (err: unknown) {
      if (err instanceof AssignmentAttemptNotFoundError) {
        return NextResponse.json(
          { error: 'ATTEMPT_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      if (err instanceof AssignmentOfferExpiredError) {
        return NextResponse.json({ error: 'OFFER_EXPIRED', message: err.message }, { status: 400 });
      }
      if (
        err instanceof AssignmentAlreadyRespondedError ||
        err instanceof BookingAlreadyAssignedError
      ) {
        return NextResponse.json(
          { error: 'ALREADY_ASSIGNED', message: err.message },
          { status: 409 },
        );
      }
      if (err instanceof DriverNotEligibleError) {
        return NextResponse.json({ error: 'NOT_ELIGIBLE', message: err.message }, { status: 403 });
      }
      const message = err instanceof Error ? err.message : 'Failed to accept assignment offer.';
      return NextResponse.json({ error: 'ACCEPT_OFFER_FAILED', message }, { status: 500 });
    }
  },
);
