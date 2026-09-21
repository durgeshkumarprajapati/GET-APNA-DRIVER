import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  listVehicleCategories,
  createVehicleCategory,
} from '@/modules/driver/application/services/vehicle-category-service';

const createCategorySchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().nullable().optional(),
  iconUrl: z.string().nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const GET = withPermission(PERMISSIONS.SYSTEM_CONFIGURATION_MANAGE, async () => {
  const categories = await listVehicleCategories(false);
  return NextResponse.json({ categories }, { status: 200 });
});

export const POST = withPermission(
  PERMISSIONS.SYSTEM_CONFIGURATION_MANAGE,
  async (req: NextRequest, { principal }) => {
    const body = await req.json();
    const parsed = createCategorySchema.parse(body);

    const category = await createVehicleCategory(principal.userId, parsed);
    return NextResponse.json({ category }, { status: 201 });
  },
);
