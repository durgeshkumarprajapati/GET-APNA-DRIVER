import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  updateVehicleCategory,
  deleteOrDeactivateVehicleCategory,
} from '@/modules/driver/application/services/vehicle-category-service';

type RouteParams = { params: Promise<{ id: string }> };

const updateCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().nullable().optional(),
  iconUrl: z.string().nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withPermission<RouteParams>(
  PERMISSIONS.SYSTEM_CONFIGURATION_MANAGE,
  async (req: NextRequest, { principal }, routeContext) => {
    const { id } = await routeContext!.params;
    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateCategorySchema.parse(body);

    const updated = await updateVehicleCategory(principal.userId, id, parsed);
    return NextResponse.json({ category: updated }, { status: 200 });
  },
);

export const DELETE = withPermission<RouteParams>(
  PERMISSIONS.SYSTEM_CONFIGURATION_MANAGE,
  async (_req: NextRequest, { principal }, routeContext) => {
    const { id } = await routeContext!.params;
    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const result = await deleteOrDeactivateVehicleCategory(principal.userId, id);
    return NextResponse.json({ result }, { status: 200 });
  },
);
