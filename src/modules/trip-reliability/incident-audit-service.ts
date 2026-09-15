import { prisma } from '@/shared/database/prisma';
import type { IncidentStatus } from './trip-reliability-types';

export interface RecordAuditInput {
  incidentId: string;
  fromStatus?: IncidentStatus | null;
  toStatus?: IncidentStatus | null;
  action: string;
  actorUserId?: string | null;
  actorRole: string;
  notes?: string | null;
}

export class IncidentAuditService {
  async recordTimelineEntry(input: RecordAuditInput) {
    return prisma.tripReliabilityTimeline.create({
      data: {
        incidentId: input.incidentId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        action: input.action,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        notes: input.notes,
      },
    });
  }
}
