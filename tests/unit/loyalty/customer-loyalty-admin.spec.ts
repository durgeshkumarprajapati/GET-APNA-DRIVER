import { listAllLoyaltyRewardsForAdmin } from '@/modules/loyalty/application/services/loyalty-reward-service';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    loyaltyReward: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'reward-1',
          title: '₹100 Off Rides',
          description: 'Flat ₹100 discount',
          rewardType: 'DISCOUNT',
          pointsRequired: 500,
          minimumTier: { id: 'tier-1', code: 'BRONZE', name: 'Bronze' },
          discountValue: 100,
          status: 'ACTIVE',
          perCustomerLimit: 1,
          totalRedemptionLimit: 100,
          totalRedeemedCount: 5,
          createdAt: new Date(),
        },
      ]),
    },
    customerLoyaltyAccount: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    loyaltyTier: {
      findUnique: jest.fn().mockResolvedValue({ id: 'tier-1', code: 'BRONZE', priority: 1, minimumLifetimePoints: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    loyaltyPointTransaction: {
      create: jest.fn().mockResolvedValue({ id: 'tx-1' }),
    },
  },
}));

describe('Customer Loyalty Admin Services & Hardening', () => {
  it('listAllLoyaltyRewardsForAdmin returns all catalog rewards for admin console without requiring customer ID', async () => {
    const rewards = await listAllLoyaltyRewardsForAdmin();

    expect(rewards).toHaveLength(1);
    expect(rewards[0].id).toBe('reward-1');
    expect(rewards[0].title).toBe('₹100 Off Rides');
    expect(rewards[0].pointsCost).toBe(500);
    expect(rewards[0].active).toBe(true);
  });
});
