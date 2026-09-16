import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { ExperienceOrchestrationService } from '@/modules/experience/application/experience-orchestration-service';
import { prisma } from '@/shared/database/prisma';

export const GET = withPermission(
  PERMISSIONS.ADMIN_EXPERIENCE_READ,
  async () => {
    try {
      const memoryMetrics = ExperienceOrchestrationService.getExperienceMetrics();

      // Query database dismissal stats
      const [totalDismissalsInDb, dismissalsByType] = await Promise.all([
        prisma.experienceDismissal.count(),
        prisma.experienceDismissal.groupBy({
          by: ['experienceType'],
          _count: { _all: true },
        }),
      ]);

      const dismissalsByTypeMap: Record<string, number> = {};
      for (const item of dismissalsByType) {
        dismissalsByTypeMap[item.experienceType] = item._count._all;
      }

      return NextResponse.json(
        {
          success: true,
          metrics: {
            ...memoryMetrics,
            totalDismissed: totalDismissalsInDb,
            dismissalsByType: dismissalsByTypeMap,
          },
        },
        { status: 200 },
      );
    } catch (error) {
      console.error('[AdminExperienceMetricsAPI] Error:', error);
      return NextResponse.json({ success: false, error: 'METRICS_FETCH_FAILED' }, { status: 500 });
    }
  },
);
