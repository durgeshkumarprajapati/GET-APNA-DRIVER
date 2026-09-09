import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listSafetyIncidents } from '@/modules/safety/application/safety-incident-service';

export const GET = withPermission(PERMISSIONS.SAFETY_INCIDENT_READ, async (req, { principal }) => {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

  const result = await listSafetyIncidents({
    reporterUserId: principal.userId,
    page,
    limit,
  });

  return NextResponse.json(result, { status: 200 });
});
