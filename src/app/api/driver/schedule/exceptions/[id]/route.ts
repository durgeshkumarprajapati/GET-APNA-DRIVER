import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { driverScheduleService } from '@/modules/driver/application/services/driver-schedule-service';
import { ScheduleExceptionNotFoundError } from '@/modules/driver/domain/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const DELETE = withPermission<RouteParams>(
  PERMISSIONS.DRIVER_SCHEDULE_MANAGE,
  async (_req, { principal }, routeContext) => {
    try {
      const { id } = await routeContext!.params;
      if (!id) {
        return NextResponse.json(
          { error: 'MISSING_ID', message: 'Exception ID is required.' },
          { status: 400 },
        );
      }

      await driverScheduleService.deleteScheduleException(principal.userId, id);
      return NextResponse.json({
        success: true,
        message: 'Schedule exception deleted successfully.',
      });
    } catch (err: unknown) {
      if (err instanceof ScheduleExceptionNotFoundError) {
        return NextResponse.json({ error: 'NOT_FOUND', message: err.message }, { status: 404 });
      }
      const message = err instanceof Error ? err.message : 'Failed to delete schedule exception.';
      return NextResponse.json({ error: 'EXCEPTION_DELETE_FAILED', message }, { status: 500 });
    }
  },
);
