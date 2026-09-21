import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { prisma } from '@/shared/database/prisma';
import { getBookingLocationIntelligence } from '@/modules/location-intelligence/application/location-intelligence-service';
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
      include: { customer: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.customerId !== principal.userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to location intelligence' },
        { status: 403 },
      );
    }

    const intel = await getBookingLocationIntelligence(bookingId);
    if (!intel) {
      return NextResponse.json({ error: 'Location intelligence unavailable' }, { status: 404 });
    }

    // Privacy filter: return only customer-authorized fields
    return NextResponse.json({
      locationIntelligence: {
        bookingId: intel.bookingId,
        status: intel.status,
        driverLocation: intel.driverLocation
          ? {
              latitude: intel.driverLocation.latitude,
              longitude: intel.driverLocation.longitude,
              heading: intel.driverLocation.heading,
              freshness: intel.driverLocation.freshness,
            }
          : null,
        pickupCoordinates: intel.pickupCoordinates,
        destinationCoordinates: intel.destinationCoordinates,
        distances: intel.distances,
        etaToPickup: intel.etaToPickup,
        etaToDestination: intel.etaToDestination,
        pickupProximity: intel.pickupProximity,
        destinationProximity: intel.destinationProximity,
        freshness: intel.freshness,
        confidence: intel.locationConfidence,
      },
    });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
