import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { driverScheduleService } from '@/modules/driver/application/services/driver-schedule-service';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { ScheduleExceptionType } from '@prisma/client';
import { InvalidScheduleTimeError } from '@/modules/driver/domain/errors';
import { toErrorResponse } from '@/shared/errors/app-error';

const createExceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
  exceptionType: z.nativeEnum(ScheduleExceptionType),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional()
    .nullable(),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional()
    .nullable(),
  reason: z.string().max(255).optional().nullable(),
});

export const GET = withPermission(PERMISSIONS.DRIVER_SCHEDULE_READ, async (_req, { principal }) => {
  try {
    const profile = await getOrCreateDriverProfile(principal.userId);
    const overview = await driverScheduleService.getDriverSchedule(profile.id);
    return NextResponse.json({ success: true, data: overview.exceptions });
  } catch (err: unknown) {
    return toErrorResponse(err, _req.nextUrl.pathname);
  }
});

export const POST = withPermission(
  PERMISSIONS.DRIVER_SCHEDULE_MANAGE,
  async (req: NextRequest, { principal }) => {
    try {
      const body = await req.json();
      const parsed = createExceptionSchema.parse(body);

      const exception = await driverScheduleService.createScheduleException(
        principal.userId,
        parsed,
      );

      return NextResponse.json({ success: true, data: exception }, { status: 201 });
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: 'Invalid exception details', details: err.issues },
          { status: 400 },
        );
      }
      if (err instanceof InvalidScheduleTimeError) {
        return NextResponse.json(
          { error: 'INVALID_SCHEDULE_TIME', message: err.message },
          { status: 400 },
        );
      }
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
