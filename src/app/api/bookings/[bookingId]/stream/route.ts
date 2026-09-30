import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { realtime, type BookingRealTimeEvent } from '@/shared/realtime/realtime-provider';
import { prisma } from '@/shared/database/prisma';

type RouteParams = { params: Promise<{ bookingId: string }> };

export const GET = withPermission<RouteParams>(
  PERMISSIONS.BOOKINGS_READ,
  async (req: NextRequest, { principal }, routeContext) => {
    const { bookingId } = await routeContext!.params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json({ error: 'BOOKING_NOT_FOUND' }, { status: 404 });
    }

    // Ensure only the booking customer, assigned driver, or admin can stream events
    if (booking.customerId !== principal.userId) {
      const driverProfile = await prisma.driverProfile.findUnique({
        where: { userId: principal.userId },
      });
      const isAssignedDriver = driverProfile && booking.driverProfileId === driverProfile.id;
      const isAdmin = principal.roles.includes('ADMINISTRATOR');

      if (!isAssignedDriver && !isAdmin) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
      }
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const sendConnectedEvent = () => {
          try {
            controller.enqueue(
              encoder.encode(
                `event: connected\ndata: ${JSON.stringify({
                  bookingId,
                  status: booking.status,
                  driverProfileId: booking.driverProfileId,
                  timestamp: new Date().toISOString(),
                  eventId: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                })}\n\n`,
              ),
            );
          } catch {
            // Stream closed
          }
        };

        sendConnectedEvent();

        const pingInterval = setInterval(() => {
          try {
            controller.enqueue(
              encoder.encode(
                `event: ping\ndata: ${JSON.stringify({
                  timestamp: new Date().toISOString(),
                  eventId: `ping_${Date.now()}`,
                })}\n\n`,
              ),
            );
          } catch {
            clearInterval(pingInterval);
          }
        }, 15000);

        const unsubscribe = realtime.subscribeBookingUpdates(
          bookingId,
          (data: BookingRealTimeEvent) => {
            try {
              controller.enqueue(
                encoder.encode(`event: booking_update\ndata: ${JSON.stringify(data)}\n\n`),
              );
            } catch {
              // Stream was closed
            }
          },
        );

        req.signal.addEventListener('abort', () => {
          clearInterval(pingInterval);
          unsubscribe();
        });
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  },
);
