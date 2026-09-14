import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { driverScheduleService } from '@/modules/driver/application/services/driver-schedule-service';
import { DayOfWeek } from '@prisma/client';
import { prisma } from '@/shared/database/prisma';

interface RouteParams {
  params: Promise<{ driverId: string }>;
}

const adminUpdateScheduleSchema = z.object({
  entries: z.array(
    z.object({
      dayOfWeek: z.nativeEnum(DayOfWeek),
      startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      timezone: z.string().optional(),
      isActive: z.boolean().optional(),
    }),
  ).min(1).max(7),
});

export const GET = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_DRIVER_SCHEDULE_READ,
  async (_req, { principal: _principal }, routeContext) => {
    try {
      const { driverId } = await routeContext!.params;
      const profile = await prisma.driverProfile.findUnique({
        where: { id: driverId },
      });

      if (!profile) {
        return NextResponse.json({ error: 'DRIVER_NOT_FOUND', message: 'Driver profile not found.' }, { status: 404 });
      }

      const schedule = await driverScheduleService.getDriverSchedule(profile.id);
      return NextResponse.json({ success: true, data: schedule });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch admin driver schedule.';
      return NextResponse.json({ error: 'ADMIN_SCHEDULE_FETCH_FAILED', message }, { status: 500 });
    }
  },
);

export const PATCH = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_DRIVER_SCHEDULE_MANAGE,
  async (req: NextRequest, { principal: _principal }, routeContext) => {
    try {
      const { driverId } = await routeContext!.params;
      const profile = await prisma.driverProfile.findUnique({
        where: { id: driverId },
      });

      if (!profile) {
        return NextResponse.json({ error: 'DRIVER_NOT_FOUND', message: 'Driver profile not found.' }, { status: 404 });
      }

      const body = await req.json();
      const parsed = adminUpdateScheduleSchema.parse(body);

      const updated = await driverScheduleService.upsertDriverWeeklySchedule(
        profile.userId,
        parsed.entries,
      );

      return NextResponse.json({ success: true, data: updated });
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'VALIDATION_ERROR', details: err.issues }, { status: 400 });
      }
      const message = err instanceof Error ? err.message : 'Failed to update driver schedule.';
      return NextResponse.json({ error: 'ADMIN_SCHEDULE_UPDATE_FAILED', message }, { status: 500 });
    }
  },
);
