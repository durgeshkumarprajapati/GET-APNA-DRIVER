import { BookingStatus } from '@prisma/client';
import { prisma } from '@/shared/database/prisma';
import { validateBookingStatusTransition } from '@/modules/booking/domain/booking-state-machine';

export class DispatchAdapter {
  /**
   * Reopens matching for a booking. Routes through the canonical booking
   * state machine rather than writing `status: 'SEARCHING_DRIVER'` directly
   * — the previous version accepted a raw status allow-list that included
   * CANCELLED, which the state machine has never treated as a valid source
   * for this transition (cancelling is terminal); an unconditional raw
   * update would have silently resurrected an already-cancelled booking.
   */
  async restartDispatchSearch(bookingId: string): Promise<boolean> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true },
    });

    if (!booking) return false;

    try {
      validateBookingStatusTransition(booking.status, BookingStatus.SEARCHING_DRIVER);
    } catch {
      return false;
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.SEARCHING_DRIVER,
        driverProfileId: null,
      },
    });

    return true;
  }
}
