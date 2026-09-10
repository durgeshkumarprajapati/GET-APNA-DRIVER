import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DriverAvailabilityStatus } from '@prisma/client';
import { withRole } from '@/modules/identity/authorization/route-guard';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import {
  getDriverAvailability,
  setDriverAvailability,
} from '@/modules/driver/application/services/driver-availability-service';

const setAvailabilitySchema = z.object({
  targetStatus: z.nativeEnum(DriverAvailabilityStatus),
});

export const GET = withRole(SYSTEM_ROLE_CODES.DRIVER, async (_req, { principal }) => {
  const result = await getDriverAvailability(principal.userId);
  return NextResponse.json(result, { status: 200 });
});

export const PUT = withRole(SYSTEM_ROLE_CODES.DRIVER, async (req, { principal }) => {
  const body = await req.json();
  const parsed = setAvailabilitySchema.parse(body);

  const profile = await setDriverAvailability(principal.userId, parsed.targetStatus, {
    ipAddress: req.headers.get('x-forwarded-for'),
  });

  return NextResponse.json({ profile }, { status: 200 });
});
