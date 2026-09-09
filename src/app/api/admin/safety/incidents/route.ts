import 'server-only';
import { NextResponse } from 'next/server';
import { SafetyIncidentStatus, SafetyIncidentSeverity } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listSafetyIncidents } from '@/modules/safety/application/safety-incident-service';

export const GET = withPermission(PERMISSIONS.SAFETY_INCIDENT_MANAGE, async (req) => {
  const { searchParams } = new URL(req.url);
  const status = (searchParams.get('status') as SafetyIncidentStatus) || undefined;
  const severity = (searchParams.get('severity') as SafetyIncidentSeverity) || undefined;
  const search = searchParams.get('search') || undefined;
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

  const result = await listSafetyIncidents({
    status,
    severity,
    search,
    page,
    limit,
  });

  return NextResponse.json(result, { status: 200 });
});
