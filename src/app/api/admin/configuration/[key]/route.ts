import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ConfigValueType } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getConfiguration, updateConfiguration } from '@/shared/config/configuration-service';

const updateConfigSchema = z.object({
  value: z.string(),
  valueType: z.nativeEnum(ConfigValueType).optional(),
  description: z.string().nullable().optional(),
  category: z.string().optional(),
  isPublic: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ key: string }>;
}

export const GET = withPermission<RouteParams>(
  PERMISSIONS.SYSTEM_CONFIGURATION_MANAGE,
  async (_req, _context, routeContext) => {
    const { key } = await routeContext!.params;
    const config = await getConfiguration(key);

    if (!config) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Configuration with key '${key}' not found.` } },
        { status: 404 },
      );
    }

    return NextResponse.json({ configuration: config }, { status: 200 });
  },
);

export const PUT = withPermission<RouteParams>(
  PERMISSIONS.SYSTEM_CONFIGURATION_MANAGE,
  async (req, { principal }, routeContext) => {
    const { key } = await routeContext!.params;
    const body = await req.json();
    const parsed = updateConfigSchema.parse(body);

    const updated = await updateConfiguration(
      principal.userId,
      {
        key,
        ...parsed,
      },
      { ipAddress: req.headers.get('x-forwarded-for') },
    );

    return NextResponse.json({ configuration: updated }, { status: 200 });
  },
);
