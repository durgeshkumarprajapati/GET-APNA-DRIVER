import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  getSafetyIncidentById,
  isAuthorizedToViewIncident,
} from '@/modules/safety/application/safety-incident-service';

type RouteParams = { params: Promise<{ incidentId: string }> };

export const GET = withPermission<RouteParams>(
  PERMISSIONS.SAFETY_INCIDENT_READ,
  async (_req, { principal }, routeContext) => {
    const { incidentId } = await routeContext!.params;
    const incident = await getSafetyIncidentById(incidentId);

    if (!incident) {
      return NextResponse.json({ error: 'Safety incident not found' }, { status: 404 });
    }

    // Customer/Driver privacy check: must be reporter, customer, or assigned driver
    const isAdmin = principal.permissions.includes(PERMISSIONS.SAFETY_INCIDENT_MANAGE);
    if (!isAuthorizedToViewIncident(incident, principal.userId) && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ incident }, { status: 200 });
  },
);
