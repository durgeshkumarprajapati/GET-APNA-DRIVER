import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  getPersonalization2Settings,
  togglePersonalization2State,
} from '@/modules/customer/application/services/personalization2-service';

const toggleSchema = z.object({
  isEnabled: z.boolean(),
});

export const GET = withPermission(
  PERMISSIONS.BOOKINGS_READ,
  async (_req, { principal }) => {
    const settings = await getPersonalization2Settings(principal.userId);
    return NextResponse.json(settings, { status: 200 });
  },
);

export const POST = withPermission(
  PERMISSIONS.BOOKINGS_READ,
  async (req, { principal }) => {
    const body = await req.json();
    const parsed = toggleSchema.parse(body);

    const result = await togglePersonalization2State(principal.userId, parsed.isEnabled);
    return NextResponse.json(result, { status: 200 });
  },
);
