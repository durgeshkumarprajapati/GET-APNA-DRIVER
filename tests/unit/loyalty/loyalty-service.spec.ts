import {
  evaluateCustomerLoyaltyForCompletedTrip,
  reverseLoyaltyPointsForTrip,
} from '@/modules/loyalty/application/services/loyalty-evaluator-service';
import {
  redeemReward,
  createLoyaltyReward,
} from '@/modules/loyalty/application/services/loyalty-reward-service';
import {
  adjustCustomerPoints,
  getCustomerLoyaltySummary,
} from '@/modules/loyalty/application/services/loyalty-account-service';
import { ensureDefaultTiers } from '@/modules/loyalty/application/services/loyalty-tier-service';
import { prisma } from '@/shared/database/prisma';

describe('Phase 35 Customer Loyalty Engine Unit Tests', () => {
  const testUserId = '11111111-2222-4333-8444-555555555535';
  const testCustomerId = '11111111-2222-4333-8444-555555555536';
  const testBookingId = '11111111-2222-4333-8444-555555555537';

  const cleanupData = async () => {
    const acc = await prisma.customerLoyaltyAccount.findUnique({
      where: { customerId: testUserId },
    });
    if (acc) {
      await prisma.loyaltyPointTransaction.deleteMany({
        where: { loyaltyAccountId: acc.id },
      });
      await prisma.loyaltyRewardRedemption.deleteMany({
        where: { loyaltyAccountId: acc.id },
      });
      await prisma.customerLoyaltyAccount.delete({
        where: { id: acc.id },
      });
    }
    await prisma.booking.deleteMany({
      where: { id: testBookingId },
    });
    await prisma.customerProfile.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
  };

  beforeAll(async () => {
    await ensureDefaultTiers();
    await cleanupData();

    // Create test user and customer profile
    await prisma.user.create({
      data: {
        id: testUserId,
        accountStatus: 'ACTIVE',
        customerProfile: {
          create: {
            id: testCustomerId,
            firstName: 'Loyalty',
            lastName: 'Tester',
          },
        },
      },
    });

    // Create test booking for foreign key constraints
    await prisma.booking.create({
      data: {
        id: testBookingId,
        customerId: testUserId,
        bookingType: 'ONE_WAY',
        status: 'TRIP_COMPLETED',
        estimatedFareAmount: 500,
        pickupLatitude: 19.076,
        pickupLongitude: 72.8777,
        pickupAddress: 'Test Pickup Address',
        dropoffAddress: 'Test Dropoff Address',
      },
    });
  });

  afterAll(async () => {
    await cleanupData();
  });

  it('should initialize a customer loyalty account with BRONZE tier', async () => {
    const summary = await getCustomerLoyaltySummary(testUserId);
    expect(summary.currentTier).toBeDefined();
    expect(summary.currentTier.code).toBe('BRONZE');
    expect(summary.currentPoints).toBe(0);
    expect(summary.lifetimeEarnedPoints).toBe(0);
  });

  it('should award points on completed trip and advance tier when threshold is met', async () => {
    // Simulate trip completion with total fare of ₹50,000 -> 500 points * 1.0 (advances to SILVER tier at 500 pts)
    const result = await evaluateCustomerLoyaltyForCompletedTrip({
      customerId: testUserId,
      bookingId: testBookingId,
      fareAmount: 50000,
    });

    expect(result.points).toBe(500);

    const summary = await getCustomerLoyaltySummary(testUserId);
    expect(summary.currentPoints).toBe(500);
    expect(summary.lifetimeEarnedPoints).toBe(500);
    expect(summary.currentTier.code).toBe('SILVER');
  });

  it('should prevent duplicate points evaluation for the same completed trip (idempotency)', async () => {
    const resultDuplicate = await evaluateCustomerLoyaltyForCompletedTrip({
      customerId: testUserId,
      bookingId: testBookingId,
      fareAmount: 50000,
    });

    // Idempotency returns existing tx with same points
    expect(resultDuplicate.idempotencyKey).toBe(`loyalty-ride-earned-${testBookingId}`);
  });

  it('should allow admin manual point adjustment', async () => {
    const { updatedAccount } = await adjustCustomerPoints({
      customerId: testUserId,
      points: 500,
      direction: 'ADD',
      reason: 'Admin goodwill grant',
      adminUserId: testUserId,
    });

    expect(updatedAccount.currentPoints).toBe(1000);
  });

  it('should redeem a reward, deduct points, and record redemption', async () => {
    const reward = await createLoyaltyReward({
      title: '₹200 Off Ride',
      rewardType: 'DISCOUNT',
      pointsRequired: 500,
      minimumTierCode: 'SILVER',
      discountValue: 200,
    });

    const redemption = await redeemReward(testUserId, reward.id);

    expect(redemption).toBeDefined();
    expect(redemption.pointsDeducted).toBe(500);

    // Check account balance after redemption
    const summary = await getCustomerLoyaltySummary(testUserId);
    expect(summary.currentPoints).toBe(500); // 1000 - 500

    // Cleanup reward
    await prisma.loyaltyRewardRedemption.deleteMany({ where: { rewardId: reward.id } });
    await prisma.loyaltyReward.delete({ where: { id: reward.id } });
  });

  it('should reverse points deterministically on refund', async () => {
    const refundResult = await reverseLoyaltyPointsForTrip(
      testBookingId,
      'Trip refund issued'
    );

    expect(refundResult).toBeDefined();
    expect(refundResult?.points).toBe(-500);

    const summary = await getCustomerLoyaltySummary(testUserId);
    expect(summary.currentPoints).toBe(0);
  });
});
