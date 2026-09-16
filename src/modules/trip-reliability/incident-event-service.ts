import { prisma } from '@/shared/database/prisma';
import type {
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  IncidentConfidence,
} from './trip-reliability-types';

export interface CreateIncidentInput {
  bookingId: string;
  customerId?: string | null;
  driverProfileId?: string | null;
  type: IncidentType;
  severity: IncidentSeverity;
  status?: IncidentStatus;
  confidence: IncidentConfidence;
  metadata?: Record<string, unknown>;
  timeBucket?: string;
}

export class IncidentEventService {
  generateFingerprint(bookingId: string, type: IncidentType, timeBucket?: string): string {
    const bucket = timeBucket || new Date().toISOString().substring(0, 16); // 1-minute bucket
    return `${bookingId}:${type}:${bucket}`;
  }

  generateIncidentNumber(): string {
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `INC-${Date.now().toString(36).toUpperCase()}-${rand}`;
  }

  async recordIncident(input: CreateIncidentInput) {
    const fingerprint = this.generateFingerprint(input.bookingId, input.type, input.timeBucket);

    try {
      const incident = await prisma.tripReliabilityIncident.create({
        data: {
          incidentNumber: this.generateIncidentNumber(),
          bookingId: input.bookingId,
          customerId: input.customerId,
          driverProfileId: input.driverProfileId,
          type: input.type,
          severity: input.severity,
          status: input.status || 'DETECTED',
          confidence: input.confidence,
          fingerprint,
          metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
          detectedAt: new Date(),
        },
      });

      // Create initial timeline entry
      await prisma.tripReliabilityTimeline.create({
        data: {
          incidentId: incident.id,
          toStatus: incident.status,
          action: 'INCIDENT_DETECTED',
          actorRole: 'SYSTEM',
          notes: `System detected ${input.type} incident with ${input.severity} severity.`,
        },
      });

      return incident;
    } catch {
      // Duplicate fingerprint / collision caught safely for idempotency
      return prisma.tripReliabilityIncident.findUnique({
        where: { fingerprint },
      });
    }
  }
}
