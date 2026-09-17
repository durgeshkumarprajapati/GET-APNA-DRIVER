import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { ExperienceOrchestrationService } from '@/modules/experience/application/experience-orchestration-service';

export const GET = withPermission(PERMISSIONS.USERS_PROFILE_READ, async (_req, { principal }) => {
  try {
    const experiences = await ExperienceOrchestrationService.generateCustomerExperiences(
      principal.userId,
    );
    return NextResponse.json(
      {
        success: true,
        experiences,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[CustomerExperienceAPI] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'EXPERIENCE_ENGINE_ERROR',
        experiences: [],
      },
      { status: 500 },
    );
  }
});
