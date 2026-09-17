import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { prisma } from '@/shared/database/prisma';
import { getDriverPickupLocationIntelligence } from '@/modules/location-intelligence/application/location-intelligence-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (req, { principal }, routeContext?: unknown) => {
  try {
    const params = await (routeContext as { params: Promise<{ bookingId: string }> })?.params;
    const bookingId = params?.bookingId;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { driverProfile: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.driverProfile?.userId !== principal.userId) {
      return NextResponse.json({ error: 'Unauthorized access to location intelligence' }, { status: 403 });
    }

    const intel = await getDriverPickupLocationIntelligence(bookingId);
    if (!intel) {
      return NextResponse.json({ error: 'Location intelligence unavailable' }, { status: 404 });
    }

    return NextResponse.json({
      locationIntelligence: {
        bookingId: intel.bookingId,
        status: intel.status,
        pickupCoordinates: intel.pickupCoordinates,
        destinationCoordinates: intel.destinationCoordinates,
        distances: intel.distances,
        etaToPickup: intel.etaToPickup,
        etaToDestination: intel.etaToDestination,
        pickupProximity: intel.pickupProximity,
        pickupZone: intel.pickupZone,
        guidance: intel.guidance,
        freshness: intel.freshness,
        confidence: intel.locationConfidence,
      },
    });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
