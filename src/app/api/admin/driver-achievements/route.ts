import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { prisma } from '@/shared/database/prisma';
import { AchievementCategory, Prisma } from '@prisma/client';

export const GET = withPermission(PERMISSIONS.ADMIN_DRIVER_ACHIEVEMENTS_READ, async () => {
  const [definitions, totalUnlocks, totalDriversWithStreak] = await Promise.all([
    prisma.driverAchievementDefinition.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { unlocks: true, progresses: true },
        },
      },
    }),
    prisma.driverAchievementUnlock.count(),
    prisma.driverStreak.count({
      where: { currentStreak: { gt: 0 } },
    }),
  ]);

  return NextResponse.json(
    {
      success: true,
      definitions,
      metrics: {
        totalDefinitions: definitions.length,
        totalUnlocks,
        totalDriversWithStreak,
      },
    },
    { status: 200 },
  );
});

export const POST = withPermission(PERMISSIONS.ADMIN_DRIVER_ACHIEVEMENTS_MANAGE, async (req) => {
  try {
    const body = await req.json();
    const { code, name, description, category, targetValue, badgeIcon, displayOrder, isActive } =
      body;

    if (!code || !name || !targetValue) {
      return NextResponse.json(
        { success: false, error: 'code, name, and targetValue are required' },
        { status: 400 },
      );
    }

    const definition = await prisma.driverAchievementDefinition.upsert({
      where: { code: String(code).toUpperCase() },
      create: {
        code: String(code).toUpperCase(),
        name: String(name),
        description: description ? String(description) : null,
        category: (category as AchievementCategory) || AchievementCategory.TRIPS,
        targetValue: new Prisma.Decimal(targetValue),
        badgeIcon: badgeIcon ? String(badgeIcon) : 'emoji_events',
        displayOrder: Number(displayOrder ?? 0),
        isActive: isActive !== false,
      },
      update: {
        name: String(name),
        description: description ? String(description) : null,
        category: (category as AchievementCategory) || AchievementCategory.TRIPS,
        targetValue: new Prisma.Decimal(targetValue),
        badgeIcon: badgeIcon ? String(badgeIcon) : 'emoji_events',
        displayOrder: Number(displayOrder ?? 0),
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({ success: true, definition }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save achievement definition';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
});
