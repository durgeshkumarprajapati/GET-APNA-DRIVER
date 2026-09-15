// Mock Prisma
jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    marketplaceRecommendationAction: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { prisma } from '@/shared/database/prisma';
import { generateOperationalRecommendations } from '@/modules/marketplace-intelligence/domain/recommendation-service';

describe('Operational Recommendation Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.marketplaceRecommendationAction.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('should generate SUPPLY_SHORTAGE recommendation when demand exceeds supply', async () => {
    const recs = await generateOperationalRecommendations({
      totalRequests: 20,
      completedRides: 15,
      cancelledRides: 2,
      dispatchEligibleSupply: 8, // 8 supply < 20 demand
      scheduledDemandCount: 0,
    });

    const supplyShortageRec = recs.find((r) => r.type === 'SUPPLY_SHORTAGE');
    expect(supplyShortageRec).toBeDefined();
    expect(supplyShortageRec?.explanation.what).toBe('Supply Shortage Detected');
  });

  it('should generate HIGH_CANCELLATION recommendation when cancellation rate >= 15%', async () => {
    const recs = await generateOperationalRecommendations({
      totalRequests: 20,
      completedRides: 14,
      cancelledRides: 5, // 25% cancellation rate
      dispatchEligibleSupply: 25,
      scheduledDemandCount: 0,
    });

    const cancellationRec = recs.find((r) => r.type === 'HIGH_CANCELLATION');
    expect(cancellationRec).toBeDefined();
    expect(cancellationRec?.severity).toBe('CRITICAL');
  });

  it('should filter out dismissed recommendations', async () => {
    (prisma.marketplaceRecommendationAction.findMany as jest.Mock).mockResolvedValue([
      { recommendationFingerprint: 'SUPPLY_SHORTAGE_GLOBAL_' + new Date().toISOString().slice(0, 13) },
    ]);

    const recs = await generateOperationalRecommendations({
      totalRequests: 20,
      completedRides: 15,
      cancelledRides: 2,
      dispatchEligibleSupply: 8,
      scheduledDemandCount: 0,
    });

    const supplyShortageRec = recs.find((r) => r.type === 'SUPPLY_SHORTAGE');
    expect(supplyShortageRec).toBeUndefined();
  });
});
