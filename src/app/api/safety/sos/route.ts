import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SafetyIncidentType, SafetyIncidentSeverity } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { triggerSos } from '@/modules/safety/application/safety-incident-service';

const triggerSosSchema = z.object({
  bookingId: z.string().uuid().optional(),
  type: z.nativeEnum(SafetyIncidentType).optional(),
  severity: z.nativeEnum(SafetyIncidentSeverity).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  locationAccuracy: z.number().optional(),
  snapshotAddress: z.string().optional(),
  description: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const POST = withPermission(
  PERMISSIONS.SAFETY_INCIDENT_CREATE,
  async (req, { principal }) => {
    try {
      const body = await req.json();
      const parsed = triggerSosSchema.parse(body);

      const incident = await triggerSos({
        reporterUserId: principal.userId,
        ...parsed,
      });

      return NextResponse.json({ incident }, { status: 201 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to trigger SOS emergency';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  },
);
