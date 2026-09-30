import 'server-only';
import { BookingStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { logger } from '@/shared/logging/logger';
import { getBoolean, getInteger } from '@/shared/config/configuration-service';
import { RedisLockService } from '@/shared/infrastructure/redis-lock-service';
import { IncidentContextService } from '@/modules/trip-reliability/incident-context-service';
import { IncidentDetectionService } from '@/modules/trip-reliability/incident-detection-service';
import { IncidentRecoveryService } from '@/modules/trip-reliability/incident-recovery-service';
import { getTripReliabilityConfig } from '@/modules/trip-reliability/trip-reliability-config';
import type { RuleEvaluationInput } from '@/modules/trip-reliability/trip-reliability-types';

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.SEARCHING_DRIVER,
  BookingStatus.DRIVER_ASSIGNED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.DRIVER_ARRIVED,
  BookingStatus.TRIP_IN_PROGRESS,
];

const SWEEP_LOCK_KEY = 'lock:trip-reliability-sweep';

const contextService = new IncidentContextService();
const detectionService = new IncidentDetectionService();
const recoveryService = new IncidentRecoveryService();

/** Module-level self-gate — see runTripReliabilitySweep for why this exists instead of an iteration-count modulo. */
let lastRunAt = 0;

export interface TripReliabilitySweepResult {
  scanned: number;
  incidentsDetected: number;
  recoveriesAttempted: number;
  skipped: boolean;
}

/**
 * The proactive half of "Phase 82 — Proactive Service Reliability &
 * Recovery": everything else in src/modules/trip-reliability/ (Phase 46)
 * already detects and recovers from disruptions correctly, but only ever
 * runs reactively — triggered by a customer or driver GETting the
 * reliability view for one specific booking. A booking nobody happens to
 * be polling right now (app closed, tab backgrounded) never gets
 * evaluated at all. This sweep periodically evaluates every active
 * booking through the exact same IncidentDetectionService/
 * IncidentRecoveryService the reactive routes already use — no new
 * detection/recovery logic, just a new caller.
 *
 * Registered unconditionally in worker/index.ts's loop, like
 * runAssignmentExpirySweep, but self-gated by `lastRunAt` rather than an
 * iteration-count modulo — its own cadence is configurable independently
 * of unrelated jobs (scheduled rides, retention cleanup) sharing that loop.
 */
export async function runTripReliabilitySweep(
  db: Db = prisma,
): Promise<TripReliabilitySweepResult> {
  const config = getTripReliabilityConfig();
  if (!config.enabled) {
    return { scanned: 0, incidentsDetected: 0, recoveriesAttempted: 0, skipped: true };
  }

  const sweepEnabled = await getBoolean('trip_reliability.sweep_enabled', true, db);
  if (!sweepEnabled) {
    return { scanned: 0, incidentsDetected: 0, recoveriesAttempted: 0, skipped: true };
  }

  const intervalSeconds = await getInteger('trip_reliability.sweep_interval_seconds', 60, db);
  if (Date.now() - lastRunAt < intervalSeconds * 1000) {
    return { scanned: 0, incidentsDetected: 0, recoveriesAttempted: 0, skipped: true };
  }

  const lockTtlMs = config.recoveryLockTtlSeconds * 1000 + 30_000;
  const acquired = await RedisLockService.acquireLock(SWEEP_LOCK_KEY, lockTtlMs);
  if (!acquired) {
    return { scanned: 0, incidentsDetected: 0, recoveriesAttempted: 0, skipped: true };
  }

  try {
    lastRunAt = Date.now();
    const batchSize = await getInteger('trip_reliability.sweep_batch_size', 200, db);

    const bookings = await db.booking.findMany({
      where: { status: { in: ACTIVE_BOOKING_STATUSES } },
      select: { id: true },
      take: batchSize,
      orderBy: { updatedAt: 'asc' },
    });

    let incidentsDetected = 0;
    let recoveriesAttempted = 0;

    for (const { id: bookingId } of bookings) {
      try {
        const outcome = await evaluateOneBooking(bookingId, db);
        if (outcome.detected) incidentsDetected++;
        if (outcome.recovered) recoveriesAttempted++;
      } catch (err) {
        logger.error(
          { bookingId, error: err },
          'Trip reliability sweep failed to evaluate one booking; continuing with the batch',
        );
      }
    }

    return {
      scanned: bookings.length,
      incidentsDetected,
      recoveriesAttempted,
      skipped: false,
    };
  } finally {
    await RedisLockService.releaseLock(SWEEP_LOCK_KEY);
  }
}

async function evaluateOneBooking(
  bookingId: string,
  db: Db,
): Promise<{ detected: boolean; recovered: boolean }> {
  const context = await contextService.assembleContext(bookingId);
  if (!context) return { detected: false, recovered: false };

  const activeSafety = await db.safetyIncident.findFirst({
    where: {
      bookingId,
      status: { in: ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'ESCALATED'] },
    },
    select: { id: true },
  });

  const input: RuleEvaluationInput = {
    bookingId,
    status: context.booking.status,
    customerId: context.booking.customerId,
    driverProfileId: context.booking.driverProfileId,
    driverId: context.booking.driverProfile?.userId ?? null,
    createdAt: context.booking.createdAt,
    updatedAt: context.booking.updatedAt,
    driverEnRouteAt: context.booking.driverEnRouteAt,
    driverArrivedAt: context.booking.driverArrivedAt,
    tripStartedAt: context.booking.tripStartedAt,
    tripCompletedAt: context.booking.tripCompletedAt,
    latestTelemetryCapturedAt: context.telemetry?.driverLocation?.capturedAt
      ? new Date(context.telemetry.driverLocation.capturedAt)
      : null,
    driverLatitude: context.telemetry?.driverLocation?.latitude,
    driverLongitude: context.telemetry?.driverLocation?.longitude,
    pickupLatitude: context.booking.pickupLatitude,
    pickupLongitude: context.booking.pickupLongitude,
    activeSafetyIncident: Boolean(activeSafety),
    paymentCaptured: context.paymentState.paymentCaptured,
    finalFareAmount: context.booking.finalFareAmount
      ? Number(context.booking.finalFareAmount)
      : null,
    hasTaxInvoice: context.paymentState.hasTaxInvoice,
  };

  const incident = await detectionService.evaluateBookingReliability(input);
  if (!incident) return { detected: false, recovered: false };

  // Only ever attempt recovery for an incident this exact call just
  // (re-)evaluated as still DETECTED — anything already further along
  // (RECOVERING/ESCALATED/etc.) is being handled by a prior attempt
  // already, and re-entering executeRecovery for it would just walk into
  // its own cooldown/retry-limit guard for no reason.
  if (incident.status !== 'DETECTED') {
    return { detected: true, recovered: false };
  }

  // executeRecovery itself branches on IncidentPolicyService — auto-recover,
  // escalate-only, or notify-only — so every newly detected incident is
  // routed through it and gets the policy-correct action, not just the
  // ones eligible for a fully automated fix.
  await recoveryService.executeRecovery(incident.id, null);
  return { detected: true, recovered: true };
}
