import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { prisma } from '@/shared/database/prisma';
import { evaluateJourneyIntelligence } from '@/modules/booking/application/journey-intelligence-service';
import { listBookingMessages } from '@/modules/booking/application/booking-messaging-service';

type RouteParams = { params: Promise<{ bookingId: string }> };

export const GET = withPermission<RouteParams>(
  PERMISSIONS.BOOKINGS_READ,
  async (_req: NextRequest, { principal }, routeContext) => {
    const { bookingId } = await routeContext!.params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        driverProfile: {
          select: {
            id: true,
            userId: true,
            displayName: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'BOOKING_NOT_FOUND' }, { status: 404 });
    }

    // Authorization check
    const isCustomer = booking.customerId === principal.userId;
    const isAssignedDriver = booking.driverProfile?.userId === principal.userId;
    const isAdmin = principal.roles.includes('ADMINISTRATOR');

    if (!isCustomer && !isAssignedDriver && !isAdmin) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    // Retrieve latest messaging state
    let messagingState = null;
    try {
      messagingState = await listBookingMessages(principal.userId, bookingId);
    } catch {
      // Non-fatal if messaging is restricted or unauthorized
    }

    const latestMessage = messagingState?.messages?.[messagingState.messages.length - 1];

    // Evaluate explainable journey intelligence
    const journeyState = evaluateJourneyIntelligence({
      bookingStatus: booking.status,
      driverLocationUpdatedAt: booking.updatedAt,
      etaMinutes: booking.estimatedDurationMinutes,
      distanceKm: booking.estimatedDistanceKm ? Number(booking.estimatedDistanceKm) : null,
    });

    return NextResponse.json(
      {
        bookingId: booking.id,
        status: booking.status,
        driverProfileId: booking.driverProfileId,
        journeyState,
        latestMessageId: latestMessage?.id ?? null,
        unreadCount: messagingState?.unreadCount ?? 0,
        canCommunicate: messagingState?.canCommunicate ?? { allowed: false, status: booking.status },
        driverLanguagesSpoken: messagingState?.driverLanguagesSpoken ?? [],
        customerLanguagesSpoken: messagingState?.customerLanguagesSpoken ?? [],
        serverTimestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  },
);
