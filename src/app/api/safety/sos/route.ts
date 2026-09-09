import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SafetyIncidentType, SafetyIncidentSeverity } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { triggerSos } from '@/modules/safety/application/safety-incident-service';
import { checkRateLimit } from '@/shared/rate-limit/rate-limiter';

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
      // Deliberately generous (20 per 5 minutes) and per-user only — this
      // must never block a genuine emergency. It exists solely to stop a
      // scripted/compromised account from flooding distinct incidents (each
      // with a different idempotencyKey, so the existing per-key dedup in
      // triggerSos wouldn't catch it); a real distressed user pressing SOS
      // even a handful of times in a panic never comes close to this.
      const rateLimit = await checkRateLimit('safety_sos', principal.userId, 20, 300);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error:
              'Too many SOS requests. If this is an emergency, contact local emergency services directly.',
          },
          { status: 429, headers: { 'Retry-After': String(rateLimit.resetSeconds) } },
        );
      }

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
