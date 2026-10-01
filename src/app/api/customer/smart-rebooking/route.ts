import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  getSmartBookingDefaults,
  getQuickRebookTemplates,
} from '@/modules/booking/application/smart-rebooking-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withPermission(PERMISSIONS.BOOKINGS_READ, async (req, { principal }) => {
  try {
    const [defaults, quickRebookCards] = await Promise.all([
      getSmartBookingDefaults(principal.userId),
      getQuickRebookTemplates(principal.userId),
    ]);

    return NextResponse.json({
      success: true,
      defaults,
      quickRebookCards,
    });
  } catch (err: unknown) {
    return toErrorResponse(err, req.nextUrl.pathname);
  }
});
