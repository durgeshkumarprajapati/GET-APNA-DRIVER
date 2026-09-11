import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { callingService } from '@/modules/calling/application/services/calling-service';
import { CallAuthorizationError, CallWindowExpiredError } from '@/modules/calling/domain/errors';

interface RouteParams {
  params: Promise<{ bookingId: string }>;
}

export const POST = withPermission<RouteParams>(
  PERMISSIONS.CALL_CUSTOMER_INITIATE,
  async (_req, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;
      if (!bookingId) {
        return NextResponse.json({ error: 'MISSING_BOOKING_ID', message: 'Booking ID is required.' }, { status: 400 });
      }

      const result = await callingService.initiateDriverToCustomerCall(principal.userId, bookingId);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch (err: unknown) {
      if (err instanceof CallAuthorizationError) {
        return NextResponse.json({ error: 'FORBIDDEN', message: err.message }, { status: 403 });
      }
      if (err instanceof CallWindowExpiredError) {
        return NextResponse.json({ error: 'CALL_WINDOW_EXPIRED', message: err.message }, { status: 400 });
      }
      const message = err instanceof Error ? err.message : 'Failed to initiate customer call.';
      return NextResponse.json({ error: 'CALL_INITIATION_FAILED', message }, { status: 500 });
    }
  },
);
