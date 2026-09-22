import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getJourneyDetails } from '@/modules/trip-execution/application/journey-orchestration-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (_req, { principal }, routeContext?: unknown) => {
  try {
    const params = await (routeContext as { params: Promise<{ bookingId: string }> })?.params;
    const bookingId = params?.bookingId;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }

    const result = await getJourneyDetails(bookingId, 'DRIVER', principal.userId);

    return NextResponse.json({ journey: result.driver }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch driver journey details.';
    if (message.includes('not found')) {
      return NextResponse.json({ error: 'BOOKING_NOT_FOUND', message }, { status: 404 });
    }
    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'UNAUTHORIZED_JOURNEY_ACCESS', message }, { status: 403 });
    }
    return toErrorResponse(err, _req.nextUrl.pathname);
  }
});
