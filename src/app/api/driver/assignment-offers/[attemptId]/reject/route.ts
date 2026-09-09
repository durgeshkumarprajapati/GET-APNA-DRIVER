import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { rejectAssignmentOffer } from '@/modules/booking/application/assignment-service';
import {
  AssignmentAttemptNotFoundError,
  AssignmentAlreadyRespondedError,
} from '@/modules/booking/domain/errors';

type RouteParams = { params: Promise<{ attemptId: string }> };

export const POST = withPermission<RouteParams>(
  PERMISSIONS.DRIVER_ASSIGNMENT_RESPOND,
  async (req, { principal }, routeContext) => {
    try {
      const { attemptId } = await routeContext!.params;
      let reason: string | undefined;
      try {
        const body = await req.json();
        reason = body.reason;
      } catch {
        // Body optional
      }

      await rejectAssignmentOffer(principal.userId, attemptId, reason);
      return NextResponse.json({ message: 'Assignment offer rejected.' }, { status: 200 });
    } catch (err: unknown) {
      if (err instanceof AssignmentAttemptNotFoundError) {
        return NextResponse.json(
          { error: 'ATTEMPT_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      if (err instanceof AssignmentAlreadyRespondedError) {
        return NextResponse.json(
          { error: 'ALREADY_RESPONDED', message: err.message },
          { status: 409 },
        );
      }
      const message = err instanceof Error ? err.message : 'Failed to reject assignment offer.';
      return NextResponse.json({ error: 'REJECT_OFFER_FAILED', message }, { status: 500 });
    }
  },
);
