import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  OutboxEventNotDeadLetteredError,
  OutboxEventNotFoundError,
  requeueDeadLetterEvent,
} from '@/shared/outbox/outbox-admin-service';
import { toErrorResponse } from '@/shared/errors/app-error';

type RouteParams = { params: Promise<{ eventId: string }> };

export const POST = withPermission<RouteParams>(
  PERMISSIONS.SYSTEM_OUTBOX_MANAGE,
  async (req, { principal }, routeContext) => {
    const { eventId } = await routeContext!.params;

    try {
      await requeueDeadLetterEvent(eventId, principal.userId);
      return NextResponse.json({ message: 'Event requeued for reprocessing.' }, { status: 200 });
    } catch (err: unknown) {
      if (err instanceof OutboxEventNotFoundError) {
        return NextResponse.json(
          { error: 'OUTBOX_EVENT_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      if (err instanceof OutboxEventNotDeadLetteredError) {
        return NextResponse.json(
          { error: 'NOT_DEAD_LETTERED', message: err.message },
          { status: 409 },
        );
      }
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
