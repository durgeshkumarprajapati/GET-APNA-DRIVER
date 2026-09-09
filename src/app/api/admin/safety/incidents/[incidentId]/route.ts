import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SafetyIncidentStatus } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  getSafetyIncidentById,
  updateSafetyIncidentStatus,
  assignSafetyOperator,
} from '@/modules/safety/application/safety-incident-service';

type RouteParams = { params: Promise<{ incidentId: string }> };

const updateIncidentSchema = z.object({
  action: z.enum(['ACKNOWLEDGE', 'ASSIGN_OPERATOR', 'UPDATE_STATUS', 'ESCALATE', 'RESOLVE']),
  toStatus: z.nativeEnum(SafetyIncidentStatus).optional(),
  assignedOperatorId: z.string().uuid().optional(),
  resolutionSummary: z.string().optional(),
  notes: z.string().optional(),
});

export const GET = withPermission<RouteParams>(
  PERMISSIONS.SAFETY_INCIDENT_MANAGE,
  async (_req, _ctx, routeContext) => {
    const { incidentId } = await routeContext!.params;
    const incident = await getSafetyIncidentById(incidentId);

    if (!incident) {
      return NextResponse.json({ error: 'Safety incident not found' }, { status: 404 });
    }

    return NextResponse.json({ incident }, { status: 200 });
  },
);

export const PATCH = withPermission<RouteParams>(
  PERMISSIONS.SAFETY_INCIDENT_MANAGE,
  async (req, { principal }, routeContext) => {
    try {
      const { incidentId } = await routeContext!.params;
      const body = await req.json();
      const parsed = updateIncidentSchema.parse(body);

      if (parsed.action === 'ASSIGN_OPERATOR') {
        const targetOperator = parsed.assignedOperatorId ?? principal.userId;
        const updated = await assignSafetyOperator({
          incidentId,
          assignedOperatorId: targetOperator,
          assignedByUserId: principal.userId,
          notes: parsed.notes,
        });
        return NextResponse.json({ incident: updated }, { status: 200 });
      }

      let targetStatus: SafetyIncidentStatus;
      if (parsed.action === 'ACKNOWLEDGE') {
        targetStatus = SafetyIncidentStatus.ACKNOWLEDGED;
      } else if (parsed.action === 'ESCALATE') {
        targetStatus = SafetyIncidentStatus.ESCALATED;
      } else if (parsed.action === 'RESOLVE') {
        targetStatus = SafetyIncidentStatus.RESOLVED;
      } else {
        if (!parsed.toStatus) {
          return NextResponse.json(
            { error: 'toStatus is required for UPDATE_STATUS action' },
            { status: 400 },
          );
        }
        targetStatus = parsed.toStatus;
      }

      const updated = await updateSafetyIncidentStatus({
        incidentId,
        actionUserId: principal.userId,
        toStatus: targetStatus,
        assignedOperatorId: parsed.assignedOperatorId ?? principal.userId,
        resolutionSummary: parsed.resolutionSummary,
        notes: parsed.notes,
      });

      return NextResponse.json({ incident: updated }, { status: 200 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update safety incident';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  },
);
