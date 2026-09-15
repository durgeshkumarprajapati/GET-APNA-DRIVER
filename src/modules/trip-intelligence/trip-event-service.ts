import { prisma } from '@/shared/database/prisma';
import type { TripSignalType, ConfidenceLevel } from './trip-intelligence-types';

export interface RecordEventInput {
  bookingId: string;
  userId: string;
  actorRole: 'CUSTOMER' | 'DRIVER';
  signalType: TripSignalType;
  confidence?: ConfidenceLevel;
  metadata?: Record<string, unknown>;
}

export class TripEventService {
  generateFingerprint(bookingId: string, userId: string, signalType: TripSignalType): string {
    return `${bookingId}:${userId}:${signalType}`;
  }

  async recordIntelligenceEvent(input: RecordEventInput): Promise<boolean> {
    const fingerprint = this.generateFingerprint(input.bookingId, input.userId, input.signalType);

    try {
      await prisma.tripIntelligenceEvent.create({
        data: {
          bookingId: input.bookingId,
          userId: input.userId,
          actorRole: input.actorRole,
          signalType: input.signalType,
          confidence: input.confidence || 'HIGH',
          fingerprint,
          metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : null,
        },
      });
      return true;
    } catch {
      // Fingerprint collision / duplicate event caught safely for idempotency
      return false;
    }
  }
}
