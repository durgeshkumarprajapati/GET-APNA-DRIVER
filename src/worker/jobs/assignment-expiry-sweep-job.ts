import 'server-only';
import { AssignmentAttemptStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { logger } from '@/shared/logging/logger';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { findAndOfferNextDriver } from '@/modules/booking/application/matching-service';

const SWEEP_BATCH_SIZE = 50;

/**
 * A driver who is offered a booking and simply never responds (neither
 * accepts nor rejects) leaves the BookingAssignmentAttempt row PENDING
 * forever — nothing else transitions it, since matching only ever resumes
 * from an explicit accept/reject response (see assignment-service.ts).
 * Without this sweep, that silently stalls the customer's whole booking in
 * SEARCHING_DRIVER indefinitely, even past its own overall search timeout,
 * because findAndOfferNextDriver (which is what actually checks and
 * enforces that overall timeout) never gets called again either.
 *
 * Runs on every worker loop iteration (see worker/index.ts) — cheap,
 * indexed query, bounded batch size, safe to run frequently.
 */
export async function runAssignmentExpirySweep(db: Db = prisma): Promise<{ sweptCount: number }> {
  const staleAttempts = await db.bookingAssignmentAttempt.findMany({
    where: {
      status: AssignmentAttemptStatus.PENDING,
      expiresAt: { lt: new Date() },
    },
    select: { id: true, bookingId: true },
    take: SWEEP_BATCH_SIZE,
  });

  let sweptCount = 0;
  for (const attempt of staleAttempts) {
    try {
      const resumed = await expireStaleAssignmentAttempt(attempt.id, attempt.bookingId, db);
      if (resumed) sweptCount++;
    } catch (err) {
      logger.error(
        { attemptId: attempt.id, bookingId: attempt.bookingId, error: err },
        'Failed to sweep a stale (no-response) assignment attempt',
      );
    }
  }

  return { sweptCount };
}

/**
 * Marks one stale attempt EXPIRED and resumes matching for its booking.
 * Returns false (a no-op) if the driver's own accept/reject response beat
 * the sweep to it — updateMany's conditional WHERE means only one of the
 * two ever actually transitions the row.
 */
async function expireStaleAssignmentAttempt(
  attemptId: string,
  bookingId: string,
  db: Db,
): Promise<boolean> {
  const updated = await db.bookingAssignmentAttempt.updateMany({
    where: { id: attemptId, status: AssignmentAttemptStatus.PENDING },
    data: { status: AssignmentAttemptStatus.EXPIRED, respondedAt: new Date() },
  });
  if (updated.count === 0) return false;

  await recordAuditLog(db, {
    actorUserId: null,
    action: 'booking.assignment.expired_no_response',
    entityType: 'BookingAssignmentAttempt',
    entityId: attemptId,
    afterState: { status: AssignmentAttemptStatus.EXPIRED, bookingId },
  });

  // findAndOfferNextDriver is itself what enforces the booking's overall
  // search timeout and offers the next candidate (or reports
  // NO_DRIVERS_FOUND) — this sweep's only job is to make sure that check
  // actually runs again after a silent timeout, not to duplicate its logic.
  try {
    await findAndOfferNextDriver(bookingId, db);
  } catch (err) {
    logger.error(
      { bookingId, error: err },
      'Failed to resume matching after assignment timeout sweep',
    );
  }

  return true;
}
