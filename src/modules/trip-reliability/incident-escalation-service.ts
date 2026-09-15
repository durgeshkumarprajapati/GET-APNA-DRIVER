import { prisma } from '@/shared/database/prisma';
import type { IncidentStatus } from './trip-reliability-types';

export class IncidentEscalationService {
  async escalateIncident(incidentId: string, actorUserId?: string | null, reason?: string) {
    const incident = await prisma.tripReliabilityIncident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) return null;

    const fromStatus = incident.status;
    const toStatus: IncidentStatus = 'ESCALATED';

    const updated = await prisma.tripReliabilityIncident.update({
      where: { id: incidentId },
      data: {
        status: toStatus,
        escalatedAt: new Date(),
      },
    });

    await prisma.tripReliabilityTimeline.create({
      data: {
        incidentId,
        fromStatus,
        toStatus,
        action: 'INCIDENT_ESCALATED',
        actorUserId,
        actorRole: actorUserId ? 'ADMIN' : 'SYSTEM',
        notes: reason || 'Incident escalated for operational support review.',
      },
    });

    return updated;
  }
}
