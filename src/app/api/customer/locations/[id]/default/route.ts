import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { setDefaultLocation } from '@/modules/location/application/saved-location-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const PUT = withAuth<RouteParams>(async (req, { principal }, routeContext) => {
  const { id } = await routeContext!.params;

  const updated = await setDefaultLocation(principal.userId, id, {
    ipAddress: req.headers.get('x-forwarded-for'),
  });

  return NextResponse.json({ location: updated }, { status: 200 });
});
