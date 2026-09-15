import { prisma } from '@/shared/database/prisma';

export class BookingAdapter {
  async getBookingForReliability(bookingId: string) {
    return prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        customerId: true,
        driverProfileId: true,
        pickupAddress: true,
        pickupLatitude: true,
        pickupLongitude: true,
        dropoffAddress: true,
        dropoffLatitude: true,
        dropoffLongitude: true,
        createdAt: true,
        updatedAt: true,
        driverEnRouteAt: true,
        driverArrivedAt: true,
        tripStartedAt: true,
        tripCompletedAt: true,
        finalFareAmount: true,
        scheduledRideId: true,
        customer: {
          select: { id: true },
        },
        driverProfile: {
          select: { id: true, userId: true },
        },
      },
    });
  }
}
