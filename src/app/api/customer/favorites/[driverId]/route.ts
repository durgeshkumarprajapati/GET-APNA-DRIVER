import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { removeFavoriteDriver } from '@/modules/favorites/favorites-service';

export const DELETE = withAuth(async (_req: NextRequest, { principal }, routeContext?: unknown) => {
  try {
    const { driverId } = (routeContext as { params: Promise<{ driverId: string }> })?.params ? await (routeContext as { params: Promise<{ driverId: string }> }).params : { driverId: '' };
    if (!driverId) {
      return NextResponse.json({ error: 'MISSING_DRIVER_ID', message: 'Driver ID is required' }, { status: 400 });
    }

    await removeFavoriteDriver(principal.userId, driverId);
    return NextResponse.json({
      success: true,
      message: 'Driver removed from favorites',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to remove favorite driver.';
    return NextResponse.json({ error: 'REMOVE_FAVORITE_FAILED', message }, { status: 500 });
  }
});
