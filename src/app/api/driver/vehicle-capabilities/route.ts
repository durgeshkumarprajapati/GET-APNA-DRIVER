import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRole } from '@/modules/identity/authorization/route-guard';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import {
  getDriverVehicleCapabilities,
  setDriverVehicleCapabilities,
} from '@/modules/driver/application/services/driver-capability-service';

const updateCapabilitiesSchema = z.object({
  categoryIds: z.array(z.string().uuid()),
});

export const GET = withRole(SYSTEM_ROLE_CODES.DRIVER, async (_req, { principal }) => {
  const profile = await getOrCreateDriverProfile(principal.userId);
  const capabilities = await getDriverVehicleCapabilities(profile.id);
  return NextResponse.json({ capabilities }, { status: 200 });
});

export const PUT = withRole(SYSTEM_ROLE_CODES.DRIVER, async (req, { principal }) => {
  const profile = await getOrCreateDriverProfile(principal.userId);
  const body = await req.json();
  const parsed = updateCapabilitiesSchema.parse(body);

  const updated = await setDriverVehicleCapabilities(
    profile.id,
    parsed.categoryIds,
    principal.userId,
  );

  return NextResponse.json({ capabilities: updated }, { status: 200 });
});
