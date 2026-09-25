import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  sendBookingMessage,
  listBookingMessages,
} from '@/modules/booking/application/booking-messaging-service';
import { checkRateLimit } from '@/shared/rate-limit/rate-limiter';
import { AppError, toErrorResponse } from '@/shared/errors/app-error';
import { BookingNotFoundError } from '@/modules/booking/domain/errors';

type RouteParams = { params: Promise<{ bookingId: string }> };

const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(500),
  messageType: z.enum(['TEXT', 'QUICK_REPLY']).optional(),
});

export const GET = withPermission<RouteParams>(
  PERMISSIONS.MESSAGE_CUSTOMER_SEND,
  async (_req, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;
      const result = await listBookingMessages(principal.userId, bookingId);
      return NextResponse.json(result, { status: 200 });
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
      return toErrorResponse(err, _req.nextUrl.pathname);
    }
  },
);

export const POST = withPermission<RouteParams>(
  PERMISSIONS.MESSAGE_CUSTOMER_SEND,
  async (req, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;

      const rateLimit = await checkRateLimit(
        'booking_message',
        `${bookingId}:${principal.userId}`,
        30,
        60,
      );
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: 'RATE_LIMIT_EXCEEDED', message: 'Too many messages sent. Please slow down.' },
          { status: 429, headers: { 'Retry-After': String(rateLimit.resetSeconds) } },
        );
      }

      const body = await req.json();
      const parsed = sendMessageSchema.parse(body);
      const message = await sendBookingMessage(principal.userId, bookingId, parsed.body, {
        messageType: parsed.messageType,
      });
      return NextResponse.json({ message }, { status: 201 });
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'INVALID_INPUT',
            message: 'Message cannot be empty or exceed 500 characters.',
            issues: err.issues,
          },
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
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
