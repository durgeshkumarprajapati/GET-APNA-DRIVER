import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { addFavoriteDriver, getCustomerFavoriteDrivers } from '@/modules/favorites/favorites-service';

const addFavoriteSchema = z.object({
  driverProfileId: z.string().uuid({ message: 'Invalid driverProfileId UUID' }),
});

export const GET = withAuth(async (_req: NextRequest, { principal }) => {
  try {
    const favorites = await getCustomerFavoriteDrivers(principal.userId);
    return NextResponse.json({
      success: true,
      favorites,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch favorite drivers.';
    return NextResponse.json({ error: 'FAVORITES_FETCH_FAILED', message }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, { principal }) => {
  try {
    const body = await req.json();
    const parsed = addFavoriteSchema.parse(body);

    const favorite = await addFavoriteDriver(principal.userId, parsed.driverProfileId);
    return NextResponse.json({
      success: true,
      favorite,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'INVALID_INPUT', message: 'Invalid driver profile ID' }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Failed to add favorite driver.';
    if (message === 'DRIVER_NOT_FOUND') {
      return NextResponse.json({ error: 'DRIVER_NOT_FOUND', message: 'Driver partner not found' }, { status: 404 });
    }
    if (message === 'DRIVER_NOT_APPROVED') {
      return NextResponse.json({ error: 'DRIVER_NOT_APPROVED', message: 'Driver partner is not approved' }, { status: 400 });
    }
    return NextResponse.json({ error: 'ADD_FAVORITE_FAILED', message }, { status: 500 });
  }
});
