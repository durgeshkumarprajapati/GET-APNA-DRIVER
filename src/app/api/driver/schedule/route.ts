import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { driverScheduleService } from '@/modules/driver/application/services/driver-schedule-service';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { DayOfWeek } from '@prisma/client';
import { InvalidScheduleTimeError } from '@/modules/driver/domain/errors';

const upsertWeeklyScheduleSchema = z.object({
  entries: z
    .array(
      z.object({
        dayOfWeek: z.nativeEnum(DayOfWeek),
        startTime: z
          .string()
          .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'startTime must be in 24-hour HH:mm format'),
        endTime: z
          .string()
          .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'endTime must be in 24-hour HH:mm format'),
        timezone: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(7),
});

export const GET = withPermission(PERMISSIONS.DRIVER_SCHEDULE_READ, async (_req, { principal }) => {
  try {
    const profile = await getOrCreateDriverProfile(principal.userId);
    const scheduleOverview = await driverScheduleService.getDriverSchedule(profile.id);
    return NextResponse.json({ success: true, data: scheduleOverview });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch schedule.';
    return NextResponse.json({ error: 'SCHEDULE_FETCH_FAILED', message }, { status: 500 });
  }
});

export const POST = withPermission(
  PERMISSIONS.DRIVER_SCHEDULE_MANAGE,
  async (req: NextRequest, { principal }) => {
    try {
      const body = await req.json();
      const parsed = upsertWeeklyScheduleSchema.parse(body);

      const updated = await driverScheduleService.upsertDriverWeeklySchedule(
        principal.userId,
        parsed.entries,
      );

      return NextResponse.json({ success: true, data: updated });
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'VALIDATION_ERROR',
            message: 'Invalid schedule parameters',
            details: err.issues,
          },
          { status: 400 },
        );
      }
      if (err instanceof InvalidScheduleTimeError) {
        return NextResponse.json(
          { error: 'INVALID_SCHEDULE_TIME', message: err.message },
          { status: 400 },
        );
      }
      const message = err instanceof Error ? err.message : 'Failed to save weekly schedule.';
      return NextResponse.json({ error: 'SCHEDULE_SAVE_FAILED', message }, { status: 500 });
    }
  },
);
