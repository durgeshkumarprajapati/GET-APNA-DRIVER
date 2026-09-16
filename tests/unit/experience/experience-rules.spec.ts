import { evaluateBookAgainRule } from '@/modules/experience/rules/book-again-rule';
import { evaluateFavoriteDriverRule } from '@/modules/experience/rules/favorite-driver-rule';
import { evaluateScheduledRideRule } from '@/modules/experience/rules/scheduled-ride-rule';
import { evaluateLoyaltyRule } from '@/modules/experience/rules/loyalty-rule';
import { evaluatePromotionRule } from '@/modules/experience/rules/promotion-rule';
import { evaluateReferralRule } from '@/modules/experience/rules/referral-rule';
import { evaluateDriverIncentiveRule } from '@/modules/experience/rules/driver-incentive-rule';
import { evaluateTripActionRule } from '@/modules/experience/rules/trip-action-rule';
import type {
  CustomerExperienceContext,
  DriverExperienceContext,
} from '@/modules/experience/domain/experience-context';

describe('Experience Rules Engine', () => {
  const baseCustomerContext: CustomerExperienceContext = {
    userId: 'user-cust-1',
    category: 'CUSTOMER',
    completedBookings: [
      {
        id: 'b-101',
        pickupAddress: 'Connaught Place, New Delhi',
        dropoffAddress: 'IGI Airport Terminal 3, New Delhi',
        pickupLat: 28.6315,
        pickupLng: 77.2167,
        dropoffLat: 28.5562,
        dropoffLng: 77.1,
        vehicleCategory: 'SEDAN',
        completedAt: new Date(),
        driverProfileId: 'drv-1',
      },
    ],
    savedLocations: [],
    favoriteDrivers: [
      {
        id: 'fd-1',
        driverProfileId: 'drv-1',
        driverName: 'Rajesh Kumar',
        isAvailable: true,
        rating: 4.95,
      },
    ],
    scheduledRides: [
      {
        id: 'sr-1',
        pickupAddress: 'Gurugram Cyber City',
        dropoffAddress: 'Noida Sector 62',
        scheduledTime: new Date(Date.now() + 86400000),
        status: 'ACTIVE',
      },
    ],
    loyaltyAccount: {
      pointsBalance: 750,
      tier: 'SILVER',
      pointsToNextTier: 250,
      availableRewardsCount: 3,
    },
    eligiblePromotions: [
      {
        code: 'WELCOME50',
        title: 'Welcome Discount',
        discountValue: '50% OFF',
      },
    ],
    referralCode: {
      code: 'DRIVE250',
      referralsCompleted: 4,
      totalEarned: '₹1000',
    },
    safetyAlerts: [],
  };

  it('evaluates Book Again rule correctly', () => {
    const res = evaluateBookAgainRule(baseCustomerContext);
    expect(res).not.toBeNull();
    expect(res?.type).toBe('BOOK_AGAIN');
    expect(res?.action.type).toBe('OPEN_BOOKING_PREFILLED');
    expect(res?.action.payload).toHaveProperty(
      'dropoffAddress',
      'IGI Airport Terminal 3, New Delhi',
    );
  });

  it('evaluates Favorite Driver rule correctly', () => {
    const res = evaluateFavoriteDriverRule(baseCustomerContext);
    expect(res).not.toBeNull();
    expect(res?.type).toBe('FAVORITE_DRIVER');
    expect(res?.action.payload).toHaveProperty('preferredDriverId', 'drv-1');
  });

  it('evaluates Scheduled Ride rule correctly', () => {
    const res = evaluateScheduledRideRule(baseCustomerContext);
    expect(res).not.toBeNull();
    expect(res?.type).toBe('SCHEDULED_RIDE');
    expect(res?.action.targetUrl).toBe('/customer/scheduled-rides/sr-1');
  });

  it('evaluates Loyalty Reward rule correctly', () => {
    const res = evaluateLoyaltyRule(baseCustomerContext);
    expect(res).not.toBeNull();
    expect(res?.type).toBe('LOYALTY_REWARD');
  });

  it('evaluates Promotion rule correctly', () => {
    const res = evaluatePromotionRule(baseCustomerContext);
    expect(res).not.toBeNull();
    expect(res?.type).toBe('PROMOTION');
    expect(res?.action.payload).toHaveProperty('code', 'WELCOME50');
  });

  it('evaluates Referral rule correctly', () => {
    const res = evaluateReferralRule(baseCustomerContext);
    expect(res).not.toBeNull();
    expect(res?.type).toBe('REFERRAL');
    expect(res?.action.payload).toHaveProperty('code', 'DRIVE250');
  });

  it('evaluates Driver Incentive & Goal rules correctly', () => {
    const driverContext: DriverExperienceContext = {
      userId: 'user-drv-1',
      driverProfileId: 'drv-profile-1',
      category: 'DRIVER',
      isOnDuty: true,
      earningsSummary: {
        todayEarnings: 1200,
        weeklyEarnings: 8400,
        completedTripsToday: 3,
      },
      incentiveCampaigns: [
        {
          id: 'camp-1',
          title: 'Shift Bonus',
          targetTrips: 5,
          completedTrips: 3,
          bonusAmount: 500,
        },
      ],
      goalPreference: {
        dailyTargetAmount: 2000,
        weeklyTargetTrips: 30,
      },
      complianceStatus: {
        isFullyVerified: true,
        pendingDocumentsCount: 0,
      },
      reliabilityIncidents: [],
    };

    const incentiveRes = evaluateDriverIncentiveRule(driverContext);
    expect(incentiveRes).not.toBeNull();
    expect(incentiveRes?.type).toBe('DRIVER_INCENTIVE');

    const tripActions = evaluateTripActionRule(driverContext);
    expect(Array.isArray(tripActions)).toBe(true);
  });
});
