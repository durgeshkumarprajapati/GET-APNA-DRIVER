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
    referralCode,
    safetyIncidents,
  ] = await Promise.all([
    // Completed Bookings (Last 5)
    prisma.booking.findMany({
      where: { customerId: userId, status: 'TRIP_COMPLETED' },
      orderBy: { completedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        pickupAddress: true,
        dropoffAddress: true,
        pickupLat: true,
        pickupLng: true,
        dropoffLat: true,
        dropoffLng: true,
        vehicleCategory: true,
        completedAt: true,
        assignedDriverId: true,
        assignedDriver: {
          select: {
            user: {
              select: {
                credentials: { select: { email: true } },
              },
            },
          },
        },
      },
    }),

    // Active Booking
    prisma.booking.findFirst({
      where: {
        customerId: userId,
        status: { in: ['ASSIGNED', 'DRIVER_EN_ROUTE', 'ARRIVED_AT_PICKUP', 'TRIP_IN_PROGRESS'] },
      },
      select: {
        id: true,
        status: true,
        pickupAddress: true,
        dropoffAddress: true,
        assignedDriverId: true,
      },
    }),

    // Saved Locations
    prisma.savedLocation.findMany({
      where: { customerId: userId },
      take: 5,
      select: {
        id: true,
        label: true,
        address: true,
        lat: true,
        lng: true,
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
            isOnline: true,
            ratingSummary: { select: { averageRating: true } },
            user: { select: { credentials: { select: { email: true } } } },
          },
        },
      },
    }),

    // Scheduled Rides
    prisma.scheduledRide.findMany({
      where: { customerId: userId, status: { in: ['ACTIVE', 'PENDING'] } },
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
        pointsBalance: true,
        tier: true,
        redemptions: { select: { id: true } },
      },
    }),

    // Eligible Active Promotions
    prisma.promotion.findMany({
      where: { isActive: true },
      take: 5,
      select: {
        code: true,
        title: true,
        discountType: true,
        discountValue: true,
        validUntil: true,
      },
    }),

    // Referral Code
    prisma.userReferralCode.findUnique({
      where: { userId },
      select: {
        code: true,
        givenReferrals: { where: { status: 'COMPLETED' }, select: { id: true } },
      },
    }),

    // Safety Alerts
    prisma.safetyIncident.findMany({
      where: { customerId: userId, status: { in: ['OPEN', 'INVESTIGATING', 'ESCALATED'] } },
      take: 2,
      select: {
        id: true,
        incidentType: true,
        severity: true,
        description: true,
      },
    }),
  ]);

  return {
    userId,
    category: 'CUSTOMER',
    completedBookings: completedBookings.map((b) => ({
      id: b.id,
      pickupAddress: b.pickupAddress,
      dropoffAddress: b.dropoffAddress,
      pickupLat: Number(b.pickupLat),
      pickupLng: Number(b.pickupLng),
      dropoffLat: Number(b.dropoffLat),
      dropoffLng: Number(b.dropoffLng),
      vehicleCategory: b.vehicleCategory,
      completedAt: b.completedAt || new Date(),
      driverProfileId: b.assignedDriverId || undefined,
      driverName: b.assignedDriver?.user?.credentials?.email?.split('@')[0] || 'Chauffeur',
    })),
    activeBooking: activeBooking
      ? {
          id: activeBooking.id,
          status: activeBooking.status,
          pickupAddress: activeBooking.pickupAddress,
          dropoffAddress: activeBooking.dropoffAddress,
          driverProfileId: activeBooking.assignedDriverId || undefined,
        }
      : null,
    savedLocations: savedLocations.map((loc) => ({
      id: loc.id,
      label: loc.label,
      address: loc.address,
      lat: Number(loc.lat),
      lng: Number(loc.lng),
    })),
    favoriteDrivers: favoriteDrivers.map((fd) => ({
      id: fd.id,
      driverProfileId: fd.driverProfileId,
      driverName: fd.driverProfile.user?.credentials?.email?.split('@')[0] || 'Driver Partner',
      isAvailable: fd.driverProfile.isOnline,
      rating: Number(fd.driverProfile.ratingSummary?.averageRating || 4.9),
    })),
    scheduledRides: scheduledRides.map((sr) => ({
      id: sr.id,
      pickupAddress: sr.pickupAddress,
      dropoffAddress: sr.dropoffAddress,
      scheduledTime: sr.scheduledTime,
      status: sr.status,
    })),
    loyaltyAccount: loyaltyAccount
      ? {
          pointsBalance: loyaltyAccount.pointsBalance,
          tier: loyaltyAccount.tier,
          pointsToNextTier: Math.max(0, 1000 - (loyaltyAccount.pointsBalance % 1000)),
          availableRewardsCount: Math.floor(loyaltyAccount.pointsBalance / 250),
        }
      : null,
    eligiblePromotions: promotions.map((p) => ({
      code: p.code,
      title: p.title,
      discountValue:
        p.discountType === 'PERCENTAGE'
          ? `${Number(p.discountValue)}% OFF`
          : `₹${Number(p.discountValue)} OFF`,
      expiresAt: p.validUntil,
    })),
    referralCode: referralCode
      ? {
          code: referralCode.code,
          referralsCompleted: referralCode.givenReferrals.length,
          totalEarned: `₹${referralCode.givenReferrals.length * 250}`,
        }
      : null,
    safetyAlerts: safetyIncidents.map((si) => ({
      id: si.id,
      type: si.incidentType,
      severity: si.severity,
      title: si.incidentType.replace('_', ' '),
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
      isOnline: true,
      approvalStatus: true,
      documents: { select: { id: true, isVerified: true } },
      assignedBookings: {
        where: {
          status: { in: ['ASSIGNED', 'DRIVER_EN_ROUTE', 'ARRIVED_AT_PICKUP', 'TRIP_IN_PROGRESS'] },
        },
        take: 1,
        select: {
          id: true,
          status: true,
          pickupAddress: true,
          dropoffAddress: true,
          customer: {
            select: { credentials: { select: { email: true } } },
          },
        },
      },
    },
  });

  if (!driverProfile) {
    return null;
  }

  const completedTodayCount = await prisma.booking.count({
    where: {
      assignedDriverId: driverProfile.id,
      status: 'TRIP_COMPLETED',
      completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
  });

  const activeBooking = driverProfile.assignedBookings[0] || null;
  const isFullyVerified = driverProfile.approvalStatus === 'APPROVED';
  const pendingDocsCount = driverProfile.documents.filter((d) => !d.isVerified).length;

  return {
    userId,
    driverProfileId: driverProfile.id,
    category: 'DRIVER',
    isOnDuty: driverProfile.isOnline,
    activeBooking: activeBooking
      ? {
          id: activeBooking.id,
          status: activeBooking.status,
          pickupAddress: activeBooking.pickupAddress,
          dropoffAddress: activeBooking.dropoffAddress,
          customerName: activeBooking.customer?.credentials?.email?.split('@')[0] || 'Customer',
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
