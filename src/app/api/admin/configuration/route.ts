import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ConfigValueType } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listConfigurations, updateConfiguration } from '@/shared/config/configuration-service';

const createOrUpdateConfigSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  valueType: z.nativeEnum(ConfigValueType).optional(),
  description: z.string().nullable().optional(),
  category: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export const GET = withPermission(PERMISSIONS.SYSTEM_CONFIGURATION_MANAGE, async (req) => {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;

  const configs = await listConfigurations(category);
  return NextResponse.json({ configurations: configs }, { status: 200 });
});

export const POST = withPermission(
  PERMISSIONS.SYSTEM_CONFIGURATION_MANAGE,
  async (req, { principal }) => {
    const body = await req.json();
    const parsed = createOrUpdateConfigSchema.parse(body);

    const updated = await updateConfiguration(principal.userId, parsed, {
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ configuration: updated }, { status: 200 });
  },
);
