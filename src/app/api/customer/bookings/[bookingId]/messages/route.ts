import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  sendBookingMessage,
  listBookingMessages,
} from '@/modules/booking/application/booking-messaging-service';
import { AppError } from '@/shared/errors/app-error';
import { BookingNotFoundError } from '@/modules/booking/domain/errors';

type RouteParams = { params: Promise<{ bookingId: string }> };

const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const GET = withPermission<RouteParams>(
  PERMISSIONS.MESSAGE_DRIVER_SEND,
  async (_req, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;
      const messages = await listBookingMessages(principal.userId, bookingId);
      return NextResponse.json({ messages }, { status: 200 });
    } catch (err: unknown) {
      if (err instanceof BookingNotFoundError) {
        return NextResponse.json(
          { error: 'BOOKING_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      if (err instanceof AppError) {
        return NextResponse.json(
          { error: err.code, message: err.message },
          { status: err.statusCode },
        );
      }
      const message = err instanceof Error ? err.message : 'Failed to load messages.';
      return NextResponse.json({ error: 'MESSAGES_FETCH_FAILED', message }, { status: 500 });
    }
  },
);

export const POST = withPermission<RouteParams>(
  PERMISSIONS.MESSAGE_DRIVER_SEND,
  async (req, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;
      const body = await req.json();
      const parsed = sendMessageSchema.parse(body);
      const message = await sendBookingMessage(principal.userId, bookingId, parsed.body);
      return NextResponse.json({ message }, { status: 201 });
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'INVALID_INPUT', message: 'Message cannot be empty.', issues: err.issues },
          { status: 400 },
        );
      }
      if (err instanceof BookingNotFoundError) {
        return NextResponse.json(
          { error: 'BOOKING_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      if (err instanceof AppError) {
        return NextResponse.json(
          { error: err.code, message: err.message },
          { status: err.statusCode },
        );
      }
      const message = err instanceof Error ? err.message : 'Failed to send message.';
      return NextResponse.json({ error: 'MESSAGE_SEND_FAILED', message }, { status: 500 });
    }
  },
);
