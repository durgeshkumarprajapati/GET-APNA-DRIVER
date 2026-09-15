import { prisma } from '@/shared/database/prisma';
import type { AIRole, AIIntent } from './ai-types';
import { getCustomerBookingLocationTelemetry, getDriverBookingLocationTelemetry } from '@/modules/location/application/booking-location-service';

export class AIContextService {
  async buildContext(userId: string, role: AIRole, intent: AIIntent): Promise<Record<string, unknown>> {
    const context: Record<string, unknown> = {};

    try {
      if (role === 'CUSTOMER') {
        await this.buildCustomerContext(userId, intent, context);
      } else {
        await this.buildDriverContext(userId, intent, context);
      }
    } catch {
      // Return safe partial context if any individual lookup throws
    }

    return context;
  }

  private async buildCustomerContext(userId: string, intent: AIIntent, context: Record<string, unknown>) {
    if (intent === 'BOOK_RIDE' || intent === 'REBOOK_RIDE') {
      const recentBooking = await prisma.booking.findFirst({
        where: { customerId: userId },
        orderBy: { createdAt: 'desc' },
        select: {
          pickupLabel: true,
          dropoffLabel: true,
          pickupAddress: true,
          dropoffAddress: true,
        },
      });

      if (recentBooking) {
        context.usualRide = {
          pickup: recentBooking.pickupLabel || recentBooking.pickupAddress,
          dropoff: recentBooking.dropoffLabel || recentBooking.dropoffAddress,
          vehicle: 'Sedan',
        };
      }
    }

    if (intent === 'CHECK_LOYALTY' || intent === 'CHECK_REWARD') {
      const account = await prisma.customerLoyaltyAccount.findUnique({
        where: { customerId: userId },
      });
      if (account) {
        context.loyalty = {
          points: account.currentPoints,
          tier: account.currentTierId || 'GOLD',
        };
      }
    }

    if (intent === 'FIND_PROMOTION') {
      const promo = await prisma.promotion.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
      if (promo) {
        context.promotion = {
          code: promo.code,
          title: promo.name,
          discountText: promo.description || 'Special Discount',
        };
      }
    }

    if (intent === 'TRACK_RIDE') {
      const activeBooking = await prisma.booking.findFirst({
        where: {
          customerId: userId,
          status: { in: ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'TRIP_IN_PROGRESS'] },
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      });

      if (activeBooking) {
        const telemetry = await getCustomerBookingLocationTelemetry(userId, activeBooking.id);
        if (telemetry) {
          context.activeTrip = telemetry;
        }
      }
    }
  }

  private async buildDriverContext(userId: string, intent: AIIntent, context: Record<string, unknown>) {
    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId },
      select: { id: true, verificationStatus: true, availabilityStatus: true },
    });

    if (!driverProfile) return;

    if (intent === 'SHIFT_SUMMARY' || intent === 'SCHEDULE_STATUS') {
      context.driverStatus = {
        verification: driverProfile.verificationStatus,
        availability: driverProfile.availabilityStatus,
      };
    }

    if (intent === 'EARNINGS_SUMMARY') {
      const completedTrips = await prisma.booking.count({
        where: {
          driverProfileId: driverProfile.id,
          status: 'TRIP_COMPLETED',
        },
      });
      context.earnings = {
        todayEarnings: completedTrips * 250,
        completedTrips,
      };
    }

    if (intent === 'CUSTOMER_PICKUP' || intent === 'TRIP_ASSISTANCE') {
      const activeBooking = await prisma.booking.findFirst({
        where: {
          driverProfileId: driverProfile.id,
          status: { in: ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'TRIP_IN_PROGRESS'] },
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, pickupLabel: true },
      });

      if (activeBooking) {
        const telemetry = await getDriverBookingLocationTelemetry(userId, activeBooking.id);
        if (telemetry) {
          context.activeBookingId = activeBooking.id;
          context.pickupAddress = activeBooking.pickupLabel;
          context.pickupTelemetry = telemetry;
        }
      }
    }
  }
}
