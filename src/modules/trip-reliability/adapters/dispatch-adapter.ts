import { prisma } from '@/shared/database/prisma';

export class DispatchAdapter {
  async restartDispatchSearch(bookingId: string): Promise<boolean> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true },
    });

    if (!booking) return false;

    if (
      booking.status === 'SEARCHING_DRIVER' ||
      booking.status === 'DRIVER_ASSIGNED' ||
      booking.status === 'CANCELLED' ||
      booking.status === 'DRAFT'
    ) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'SEARCHING_DRIVER',
          driverProfileId: null,
        },
      });

      return true;
    }

    return false;
  }
}
