import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  listMarketplaceZonesWithAnalytics,
  createOrUpdateMarketplaceZone,
} from '@/modules/location/application/marketplace-zone-service';

const createZoneSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(3),
  description: z.string().optional(),
  centerLatitude: z.number().min(-90).max(90),
  centerLongitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().min(500).max(100000),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const GET = withPermission(PERMISSIONS.ADMIN_MARKETPLACE_INTELLIGENCE_READ, async (_req) => {
  const zones = await listMarketplaceZonesWithAnalytics();
  return NextResponse.json({ zones }, { status: 200 });
});

export const POST = withPermission(
  PERMISSIONS.ADMIN_MARKETPLACE_INTELLIGENCE_MANAGE,
  async (req, { principal }) => {
    const body = await req.json();
    const parsed = createZoneSchema.parse(body);

    const zone = await createOrUpdateMarketplaceZone(parsed, principal.userId);
    return NextResponse.json({ success: true, zone }, { status: 201 });
  },
);
