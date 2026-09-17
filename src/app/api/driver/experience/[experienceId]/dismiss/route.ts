import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { dismissExperience } from '@/modules/experience/application/experience-dismissal-service';

export const POST = withPermission(
  PERMISSIONS.USERS_PROFILE_READ,
  async (req, { principal }, routeContext?: { params: Promise<{ experienceId: string }> }) => {
    try {
      const { experienceId } = (await routeContext?.params) || { experienceId: '' };
      const body = await req.json().catch(() => ({}));
      const fingerprint = body.fingerprint || experienceId;
      const experienceType = body.type || 'DRIVER_RECOMMENDATION';

      if (!fingerprint) {
        return NextResponse.json({ success: false, error: 'MISSING_FINGERPRINT' }, { status: 400 });
      }

      const success = await dismissExperience(principal.userId, experienceType, fingerprint);

      return NextResponse.json({ success }, { status: 200 });
    } catch (error) {
      console.error('[DriverExperienceDismissAPI] Error:', error);
      return NextResponse.json({ success: false, error: 'DISMISSAL_FAILED' }, { status: 500 });
    }
  },
);
