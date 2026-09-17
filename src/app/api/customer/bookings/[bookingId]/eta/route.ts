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

    // Ownership check
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.customerId !== principal.userId) {
      return NextResponse.json({ error: 'Unauthorized access to booking ETA' }, { status: 403 });
    }

    const intel = await getBookingLocationIntelligence(bookingId);
    if (!intel) {
      return NextResponse.json({ error: 'Location intelligence unavailable' }, { status: 404 });
    }

    return NextResponse.json({
      bookingId: intel.bookingId,
      status: intel.status,
      etaToPickup: intel.etaToPickup,
      etaToDestination: intel.etaToDestination,
      distances: intel.distances,
      freshness: intel.freshness,
      confidence: intel.locationConfidence.level,
    });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
