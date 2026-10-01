import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  evaluateFeatureFlag,
  getExperimentGuardrailStatus,
} from '@/modules/analytics/application/experimentation-analytics-service';

const evaluateFlagSchema = z.object({
  experimentKey: z.string().min(2),
  userLocale: z.string().optional(),
});

export const POST = withPermission(
  PERMISSIONS.ADMIN_PLATFORM_METRICS_READ,
  async (req, { principal }) => {
    const body = await req.json();
    const parsed = evaluateFlagSchema.parse(body);

    const evaluation = evaluateFeatureFlag({
      experimentKey: parsed.experimentKey,
      userId: principal.userId,
      userLocale: parsed.userLocale,
    });

    const guardrail = getExperimentGuardrailStatus(parsed.experimentKey);

    return NextResponse.json({ evaluation, guardrail }, { status: 200 });
  },
);
