import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import {
  getDriverGoal,
  updateDriverGoal,
} from '@/modules/incentive/application/services/driver-goal-service';

const updateGoalSchema = z.object({
  dailyTripGoal: z.number().int().min(1).max(200).optional(),
  // The service converts this to Prisma.Decimal directly, and deliberately
  // accepts a numeric string too (avoids float precision loss for money) —
  // this schema keeps that but rejects anything that isn't actually a
  // valid decimal amount. Without it, a body like {"weeklyEarningsGoal":
  // "abc"} coerced to NaN downstream, and `NaN < 1`/`NaN.lte(0)` are both
  // `false` in JS, so the service's own guards silently let it through to
  // a raw Prisma type error instead of a clean validation error.
  weeklyEarningsGoal: z
    .union([z.number().positive(), z.string().regex(/^\d+(\.\d{1,4})?$/)])
    .optional(),
});

export const GET = withPermission(
  PERMISSIONS.DRIVER_INCENTIVES_READ,
  async (_req, { principal }) => {
    const profile = await getOrCreateDriverProfile(principal.userId);
    const goal = await getDriverGoal(profile.id);
    return NextResponse.json({ success: true, data: goal }, { status: 200 });
  },
);

export const POST = withPermission(PERMISSIONS.DRIVER_GOALS_MANAGE, async (req, { principal }) => {
  const profile = await getOrCreateDriverProfile(principal.userId);
  const body = await req.json();
  let parsed;
  try {
    parsed = updateGoalSchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Invalid goal values.', issues: err.issues },
        { status: 400 },
      );
    }
    throw err;
  }
  const goal = await updateDriverGoal(profile.id, parsed);
  return NextResponse.json({ success: true, data: goal }, { status: 200 });
});
