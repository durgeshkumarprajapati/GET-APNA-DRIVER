import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { trackAndGetGrowthExperimentReport } from '@/modules/analytics/application/services/growth-experimentation-service';

const trackSchema = z.object({
  experimentKey: z.string().optional(),
});

export const POST = withPermission(
  PERMISSIONS.ADMIN_PLATFORM_METRICS_READ,
  async (req) => {
    const body = await req.json().catch(() => ({}));
    const parsed = trackSchema.parse(body);

    const report = await trackAndGetGrowthExperimentReport(parsed.experimentKey);
    return NextResponse.json(report, { status: 200 });
  },
);
