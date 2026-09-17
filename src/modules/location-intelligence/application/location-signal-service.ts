import 'server-only';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { prisma, type Db } from '@/shared/database/prisma';

export type LocationSignalType =
  | 'DRIVER_NEAR_PICKUP'
  | 'DRIVER_AT_PICKUP'
  | 'DESTINATION_NEAR'
  | 'LOCATION_STALE'
  | 'LOCATION_UNAVAILABLE'
  | 'LOCATION_ANOMALY'
  | 'ETA_DEGRADATION'
  | 'GEOFENCE_EVENT';

export interface LocationSignalPayload {
  bookingId?: string;
  driverProfileId?: string;
  signalType: LocationSignalType;
  details: Record<string, unknown>;
  timestamp: string;
}

export async function emitLocationSignal(
  payload: LocationSignalPayload,
  db: Db = prisma,
): Promise<void> {
  const aggregateId = payload.bookingId || payload.driverProfileId || 'SYSTEM';

  try {
    await insertOutboxEvent(db, {
      eventType: `location_intelligence.signal.${payload.signalType.toLowerCase()}`,
      aggregateType: payload.bookingId ? 'Booking' : 'DriverProfile',
      aggregateId,
      payload: {
        ...payload,
        emittedAt: new Date().toISOString(),
      },
    });
  } catch {
    // Fail-open for signal emission
  }
}
