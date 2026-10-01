import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import {
  recordCustomerActivationEvent,
  isCustomerActivationEvent,
} from '@/modules/activation/application/activation-tracking-service';
import { toErrorResponse } from '@/shared/errors/app-error';

/**
 * Fire-and-forget onboarding-funnel event logging — see
 * activation-tracking-service.ts. Only an allowlisted set of event names is
 * accepted, so client input can't write arbitrary audit-log actions.
 */
export const POST = withAuth(async (req: NextRequest, { principal }) => {
  try {
    const body = await req.json().catch(() => ({}));
    const event = body?.event;
    if (!isCustomerActivationEvent(event)) {
      return NextResponse.json({ error: 'INVALID_EVENT' }, { status: 400 });
    }
    await recordCustomerActivationEvent(principal.userId, event);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return toErrorResponse(err, req.nextUrl.pathname);
  }
});
