import 'server-only';
import { NextResponse } from 'next/server';
import { withRole } from '@/modules/identity/authorization/route-guard';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { evaluateDriverEligibility } from '@/modules/driver/application/services/driver-eligibility-service';
import { listDriverDocuments } from '@/modules/driver/application/services/driver-document-service';

export const GET = withRole(SYSTEM_ROLE_CODES.DRIVER, async (_req, { principal }) => {
  const profile = await getOrCreateDriverProfile(principal.userId);
  const evaluation = await evaluateDriverEligibility(profile.id);
  const documents = await listDriverDocuments(profile.id, true);

  return NextResponse.json(
    {
      profile,
      evaluation,
      documents,
    },
    { status: 200 },
  );
});
