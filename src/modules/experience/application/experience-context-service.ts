import { prisma } from '@/shared/database/prisma';
import type {
  CustomerExperienceContext,
  DriverExperienceContext,
} from '../domain/experience-context';

export async function getCustomerExperienceContext(
  userId: string,
): Promise<CustomerExperienceContext> {
  const [
    completedBookings,
    activeBooking,
    savedLocations,
    favoriteDrivers,
    scheduledRides,
    loyaltyAccount,
    promotions,
    userRefCode,
    safetyIncidents,
  ] = await Promise.all([
    // Completed Bookings (Last 5)
    prisma.booking.findMany({
      where: { customerId: userId, status: 'TRIP_COMPLETED' },
      orderBy: { tripCompletedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        pickupAddress: true,
        dropoffAddress: true,
        pickupLatitude: true,
        pickupLongitude: true,
        dropoffLatitude: true,
        dropoffLongitude: true,
        bookingType: true,
        tripCompletedAt: true,
        driverProfileId: true,
        driverProfile: {
          select: {
            firstName: true,
            displayName: true,
          },
        },
      },
    }),

    // Active Booking
    prisma.booking.findFirst({
      where: {
        customerId: userId,
        status: {
          in: ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'TRIP_IN_PROGRESS'],
        },
      },
      select: {
        id: true,
        status: true,
        pickupAddress: true,
        dropoffAddress: true,
        driverProfileId: true,
        driverProfile: {
          select: {
            firstName: true,
            displayName: true,
          },
        },
      },
    }),

    // Saved Locations
    prisma.savedLocation.findMany({
      where: { userId: userId },
      take: 5,
      select: {
        id: true,
        label: true,
        addressLine1: true,
        city: true,
        latitude: true,
        longitude: true,
      },
    }),

    // Favorite Drivers
    prisma.customerFavoriteDriver.findMany({
      where: { customerId: userId },
      take: 5,
      select: {
        id: true,
        driverProfileId: true,
        driverProfile: {
          select: {
            id: true,
            availabilityStatus: true,
            firstName: true,
            displayName: true,
            ratingSummary: { select: { averageRating: true } },
          },
        },
      },
    }),

    // Scheduled Rides
    prisma.scheduledRide.findMany({
      where: { customerId: userId, status: 'ACTIVE' },
      orderBy: { scheduledTime: 'asc' },
      take: 3,
      select: {
        id: true,
        pickupAddress: true,
        dropoffAddress: true,
        scheduledTime: true,
        status: true,
      },
    }),

    // Loyalty Account
    prisma.customerLoyaltyAccount.findUnique({
      where: { customerId: userId },
      select: {
        currentPoints: true,
        currentTier: { select: { name: true } },
      },
    }),

    // Eligible Active Promotions
    prisma.promotion.findMany({
      where: { status: 'ACTIVE' },
      take: 5,
      select: {
        code: true,
        name: true,
        discountType: true,
        discountValue: true,
        endsAt: true,
      },
    }),

    // Referral Code
    prisma.userReferralCode.findUnique({
      where: { userId },
      select: {
        code: true,
      },
    }),

    // Safety Alerts
    prisma.safetyIncident.findMany({
      where: { customerId: userId, status: { in: ['OPEN', 'INVESTIGATING', 'ESCALATED'] } },
      take: 2,
      select: {
        id: true,
        type: true,
        severity: true,
      },
    }),
  ]);

  // Fetch referrals completed count if referral code exists
  let referralsCompleted = 0;
  if (userRefCode) {
    referralsCompleted = await prisma.referral.count({
      where: { referrerUserId: userId, status: { in: ['QUALIFIED', 'REWARDED'] } },
    });
  }

  return {
    userId,
    category: 'CUSTOMER',
    completedBookings: completedBookings.map((b) => ({
      id: b.id,
      pickupAddress: b.pickupAddress,
      dropoffAddress: b.dropoffAddress || '',
      pickupLat: Number(b.pickupLatitude),
      pickupLng: Number(b.pickupLongitude),
      dropoffLat: Number(b.dropoffLatitude || 0),
      dropoffLng: Number(b.dropoffLongitude || 0),
      vehicleCategory: b.bookingType,
      completedAt: b.tripCompletedAt || new Date(),
      driverProfileId: b.driverProfileId || undefined,
      driverName: b.driverProfile?.displayName || b.driverProfile?.firstName || 'Chauffeur',
    })),
    activeBooking: activeBooking
      ? {
          id: activeBooking.id,
          status: activeBooking.status,
          pickupAddress: activeBooking.pickupAddress,
          dropoffAddress: activeBooking.dropoffAddress || '',
          driverProfileId: activeBooking.driverProfileId || undefined,
          driverName:
            activeBooking.driverProfile?.displayName ||
            activeBooking.driverProfile?.firstName ||
            undefined,
        }
      : null,
    savedLocations: savedLocations.map((loc) => ({
      id: loc.id,
      label: loc.label,
      address: loc.city ? `${loc.addressLine1}, ${loc.city}` : loc.addressLine1,
      lat: Number(loc.latitude),
      lng: Number(loc.longitude),
    })),
    favoriteDrivers: favoriteDrivers.map((fd) => ({
      id: fd.id,
      driverProfileId: fd.driverProfileId,
      driverName: fd.driverProfile.displayName || fd.driverProfile.firstName || 'Driver Partner',
      isAvailable: fd.driverProfile.availabilityStatus === 'AVAILABLE',
      rating: Number(fd.driverProfile.ratingSummary?.averageRating || 4.9),
    })),
    scheduledRides: scheduledRides.map((sr) => ({
      id: sr.id,
      pickupAddress: sr.pickupAddress,
      dropoffAddress: sr.dropoffAddress || '',
      scheduledTime: new Date(sr.scheduledTime),
      status: String(sr.status),
    })),
    loyaltyAccount: loyaltyAccount
      ? {
          pointsBalance: loyaltyAccount.currentPoints,
          tier: loyaltyAccount.currentTier?.name || 'Silver',
          pointsToNextTier: Math.max(0, 1000 - (loyaltyAccount.currentPoints % 1000)),
          availableRewardsCount: Math.floor(loyaltyAccount.currentPoints / 250),
        }
      : null,
    eligiblePromotions: promotions.map((p) => ({
      code: p.code || 'PROMO',
      title: p.name,
      discountValue:
        p.discountType === 'PERCENTAGE'
          ? `${Number(p.discountValue)}% OFF`
          : `₹${Number(p.discountValue)} OFF`,
      expiresAt: p.endsAt,
    })),
    referralCode: userRefCode
      ? {
          code: userRefCode.code,
          referralsCompleted,
          totalEarned: `₹${referralsCompleted * 250}`,
        }
      : null,
    safetyAlerts: safetyIncidents.map((si) => ({
      id: si.id,
      type: String(si.type),
      severity: String(si.severity),
      title: String(si.type).replace(/_/g, ' '),
    })),
  };
}

export async function getDriverExperienceContext(
  userId: string,
): Promise<DriverExperienceContext | null> {
  const driverProfile = await prisma.driverProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      approvalStatus: true,
      availabilityStatus: true,
      firstName: true,
      displayName: true,
    },
  });

  if (!driverProfile) {
    return null;
  }

  const [completedTodayCount, activeBooking, pendingDocsCount] = await Promise.all([
    prisma.booking.count({
      where: {
        driverProfileId: driverProfile.id,
        status: 'TRIP_COMPLETED',
        tripCompletedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.booking.findFirst({
      where: {
        driverProfileId: driverProfile.id,
        status: {
          in: ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'TRIP_IN_PROGRESS'],
        },
      },
      select: {
        id: true,
        status: true,
        pickupAddress: true,
        dropoffAddress: true,
        customer: {
          select: { id: true },
        },
      },
    }),
    prisma.driverDocument.count({
      where: {
        driverProfileId: driverProfile.id,
        status: { notIn: ['VERIFIED'] },
      },
    }),
  ]);

  const isFullyVerified = driverProfile.approvalStatus === 'APPROVED';

  return {
    userId,
    driverProfileId: driverProfile.id,
    category: 'DRIVER',
    isOnDuty: driverProfile.availabilityStatus === 'AVAILABLE',
    activeBooking: activeBooking
      ? {
          id: activeBooking.id,
          status: activeBooking.status,
          pickupAddress: activeBooking.pickupAddress,
          dropoffAddress: activeBooking.dropoffAddress || '',
          customerName: 'Customer',
        }
      : null,
    todaysSchedule: {
      shiftStart: '08:00 AM',
      shiftEnd: '08:00 PM',
      isAvailableToday: true,
    },
    earningsSummary: {
      todayEarnings: completedTodayCount * 450,
      weeklyEarnings: completedTodayCount * 450 * 5,
      completedTripsToday: completedTodayCount,
    },
    incentiveCampaigns: [
      {
        id: 'camp_shift_bonus_01',
        title: 'Daily Shift Completion Bonus',
        targetTrips: 5,
        completedTrips: completedTodayCount,
        bonusAmount: 500,
      },
    ],
    goalPreference: {
      dailyTargetAmount: 2000,
      weeklyTargetTrips: 30,
    },
    complianceStatus: {
      isFullyVerified,
      pendingDocumentsCount: pendingDocsCount,
    },
    reliabilityIncidents: [],
  };
}
