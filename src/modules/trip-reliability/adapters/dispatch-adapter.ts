import { BookingStatus, DriverAvailabilityStatus } from '@prisma/client';
import { prisma } from '@/shared/database/prisma';
import { validateBookingStatusTransition } from '@/modules/booking/domain/booking-state-machine';
import { getInteger } from '@/shared/config/configuration-service';
import { findAndOfferNextDriver } from '@/modules/booking/application/matching-service';
import { SEARCH_DEADLINE_SECONDS } from '@/modules/dispatch/application/dispatch-search-service';
import { logger } from '@/shared/logging/logger';

export class DispatchAdapter {
  /**
   * Reopens matching for a booking. Routes through the canonical booking
   * state machine rather than writing `status: 'SEARCHING_DRIVER'` directly
   * — the previous version accepted a raw status allow-list that included
   * CANCELLED, which the state machine has never treated as a valid source
   * for this transition (cancelling is terminal); an unconditional raw
   * update would have silently resurrected an already-cancelled booking.
   *
   * Regression: this previously stopped at the state-machine check and a
   * plain status write. When the booking was already SEARCHING_DRIVER (the
   * exact case the ASSIGNMENT_TIMEOUT incident rule fires for —
   * assignment-timeout-rule.ts — since it only triggers while
   * status === SEARCHING_DRIVER), validateBookingStatusTransition treats a
   * same-status transition as a no-op success (booking-state-machine.ts),
   * so this rewrote the row to the value it already had and returned
   * `true` — without ever actually re-invoking matching. The caller
   * (incident-recovery-service.ts) then marked the incident RESOLVED on
   * that false "success," closing it without the customer's search ever
   * actually being retried. This now always resets the search window and
   * calls findAndOfferNextDriver, which is the only thing that actually
   * offers the booking to a candidate driver again.
   */
  async restartDispatchSearch(bookingId: string): Promise<boolean> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, driverProfileId: true },
    });

    if (!booking) return false;

    try {
      validateBookingStatusTransition(booking.status, BookingStatus.SEARCHING_DRIVER);
    } catch {
      return false;
    }

    const searchTimeoutSeconds = await getInteger(
      'booking.matching.search_timeout_seconds',
      SEARCH_DEADLINE_SECONDS,
    );
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      if (booking.driverProfileId) {
        await tx.driverProfile.update({
          where: { id: booking.driverProfileId },
          data: { availabilityStatus: DriverAvailabilityStatus.AVAILABLE },
        });
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.SEARCHING_DRIVER,
          driverProfileId: null,
          assignedAt: null,
          // A fresh search window: the incident that triggers this recovery
          // only fires after the booking has already been stuck for
          // several minutes (see assignment-timeout-rule.ts), so the
          // original deadline has typically already passed — without
          // resetting it, the very next findAndOfferNextDriver call below
          // would immediately see the overall timeout exceeded and cancel
          // the booking outright instead of actually retrying.
          searchStartedAt: now,
          expiresAt: new Date(now.getTime() + searchTimeoutSeconds * 1000),
        },
      });
    });

    try {
      await findAndOfferNextDriver(bookingId);
    } catch (err) {
      logger.error(
        { bookingId, error: err },
        'Failed to resume matching while recovering a stalled dispatch search',
      );
      return false;
    }

    return true;
  }
}
