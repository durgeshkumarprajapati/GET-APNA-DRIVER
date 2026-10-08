import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { ServiceQualityTrustDetailsDTO } from '../../domain/service-quality-types';

const GENERIC_TRUST_DETAILS: Pick<
  ServiceQualityTrustDetailsDTO,
  'whatItCosts' | 'whatIfSomethingGoesWrong'
> = {
  whatItCosts: {
    baseRate: '₹350 for first 2 hours',
    perKmRate: '₹15 / km thereafter',
    nightSurgePolicy: 'Flat ₹150 night allowance for trips between 10 PM - 6 AM',
    cancellationPolicy: 'Free cancellation up to 30 minutes before driver arrival',
  },
  whatIfSomethingGoesWrong: {
    emergencySosButton: true,
    supportHelpline: '1800-APNA-DRIVER (24x7 Instant Support)',
    // A prior version claimed fare was "held in escrow" with a "100%
    // money-back satisfaction guarantee" — no escrow mechanism or
    // money-back guarantee exists anywhere in this platform, so that was a
    // fabricated commercial claim. Support/dispute handling (SupportTicket,
    // Refund) is real; stated honestly without inventing a specific policy.
    paymentProtectionGuarantee:
      'Payment issues and disputes are handled through in-app support, with refunds processed per case.',
    incidentEscalationPolicy:
      'Safety incidents reported via SOS are routed to our safety team for review and follow-up.',
  },
};

/**
 * Phase 107 — Service Quality & Trust Service
 * Provides full pre-booking transparency: Who is coming, what they can do, what it costs,
 * and what happens if something goes wrong.
 *
 * A prior version returned a stock photo as the driver's avatar and a fixed
 * list of safety badges ("Background Verified", "Police Cleared", "COVID
 * Vaccinated") regardless of whether driverProfileId resolved to a real
 * driver, or whether that driver actually holds any of those statuses —
 * presenting an unverified stranger's claimed identity and safety status as
 * fact is exactly the kind of trust violation this feature exists to
 * prevent. Verification badges now only ever reflect what the real
 * onboarding pipeline recorded for that specific driver.
 */
export async function getServiceQualityTrustDetails(
  driverProfileId?: string,
  db: Db = prisma,
): Promise<ServiceQualityTrustDetailsDTO> {
  const driverProfile = driverProfileId
    ? await db.driverProfile.findUnique({
        where: { id: driverProfileId },
        include: {
          ratingSummary: true,
          vehicleCapabilities: { include: { vehicleCategory: { select: { name: true } } } },
        },
      })
    : null;

  if (!driverProfile) {
    return {
      whoIsComing: {
        driverName: 'Assigned at booking time',
        avatarUrl: null,
        rating: 0,
        completedRides: 0,
        verificationBadges: [],
        vehicleInfo: 'Vehicle category shown at booking time',
      },
      whatTheyCanDo: {
        vehicleCapabilities: [],
        experienceYears: 0,
        languagesSpoken: [],
      },
      ...GENERIC_TRUST_DETAILS,
    };
  }

  const completedRides = await db.booking.count({
    where: { driverProfileId: driverProfile.id, status: 'TRIP_COMPLETED' },
  });

  return {
    whoIsComing: {
      driverName:
        driverProfile.displayName ||
        [driverProfile.firstName, driverProfile.lastName].filter(Boolean).join(' ') ||
        'Assigned Driver',
      avatarUrl: driverProfile.profileImageUrl || null,
      rating: driverProfile.ratingSummary ? Number(driverProfile.ratingSummary.averageRating) : 0,
      completedRides,
      verificationBadges: [
        ...(driverProfile.verificationStatus === 'VERIFIED' ? ['Documents Verified'] : []),
        ...(driverProfile.approvalStatus === 'APPROVED' ? ['Approved Partner'] : []),
      ],
      vehicleInfo:
        driverProfile.vehicleCapabilities.map((c) => c.vehicleCategory.name).join(' / ') ||
        'Vehicle category shown at booking time',
    },
    whatTheyCanDo: {
      vehicleCapabilities: driverProfile.vehicleCapabilities.map((c) => c.vehicleCategory.name),
      experienceYears: driverProfile.drivingExperienceYears,
      languagesSpoken: driverProfile.languagesSpoken,
    },
    ...GENERIC_TRUST_DETAILS,
  };
}
