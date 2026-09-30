import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { TripReliabilityService } from '@/modules/trip-reliability/trip-reliability-service';
import { checkRateLimit } from '@/shared/rate-limit/rate-limiter';
import { toErrorResponse } from '@/shared/errors/app-error';

type RouteParams = { params: Promise<{ bookingId: string }> };

const confirmSchema = z.object({
  incidentId: z.string().min(1),
  response: z.enum(['STILL_TRAVELLING', 'ARRIVED', 'TEMPORARILY_DELAYED', 'UNABLE_TO_CONTINUE']),
});

const service = new TripReliabilityService();

export const POST = withPermission<RouteParams>(
  PERMISSIONS.DRIVER_JOURNEY_MANAGE,
  async (req: NextRequest, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;

      const rateLimit = await checkRateLimit(
        'trip_reliability_driver_confirm',
        `${bookingId}:${principal.userId}`,
        10,
        60,
      );
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: 'RATE_LIMITED', message: 'Too many confirmation attempts. Please slow down.' },
          { status: 429, headers: { 'Retry-After': String(rateLimit.resetSeconds) } },
        );
      }

      const body = confirmSchema.parse(await req.json());
      const result = await service.recordDriverConfirmation(
        principal.userId,
        body.incidentId,
        body.response,
        bookingId,
      );

      return NextResponse.json({ success: true, data: result }, { status: 200 });
    } catch (err: unknown) {
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
