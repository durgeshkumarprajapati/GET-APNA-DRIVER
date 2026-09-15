import { evaluateTravelPolicy } from '@/modules/corporate/domain/corporate-policy-service';

// Mock Prisma
jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    organizationTravelPolicy: {
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from '@/shared/database/prisma';

describe('Corporate Travel Policy Evaluator Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow ride without approval if fare and distance are within policy limits', async () => {
    (prisma.organizationTravelPolicy.findFirst as jest.Mock).mockResolvedValue({
      id: 'pol-1',
      name: 'Standard Policy',
      maxFareAmount: 5000,
      maxDistanceKm: 100,
      allowedVehicleCategories: ['SEDAN', 'SUV'],
      requireApprovalAboveAmount: 3000,
      requireApprovalAllRides: false,
    });

    const result = await evaluateTravelPolicy({
      organizationId: 'org-1',
      userId: 'user-1',
      estimatedFare: 1500,
      estimatedDistanceKm: 25,
      vehicleCategory: 'SEDAN',
    });

    expect(result.allowed).toBe(true);
    expect(result.requiresApproval).toBe(false);
    expect(result.violations).toHaveLength(0);
  });

  it('should trigger approval if fare exceeds approval threshold', async () => {
    (prisma.organizationTravelPolicy.findFirst as jest.Mock).mockResolvedValue({
      id: 'pol-1',
      name: 'Standard Policy',
      maxFareAmount: 5000,
      maxDistanceKm: 100,
      allowedVehicleCategories: ['SEDAN', 'SUV'],
      requireApprovalAboveAmount: 3000,
      requireApprovalAllRides: false,
    });

    const result = await evaluateTravelPolicy({
      organizationId: 'org-1',
      userId: 'user-1',
      estimatedFare: 3500,
      estimatedDistanceKm: 40,
      vehicleCategory: 'SEDAN',
    });

    expect(result.allowed).toBe(true);
    expect(result.requiresApproval).toBe(true);
  });

  it('should record violation and trigger approval if fare exceeds max fare cap', async () => {
    (prisma.organizationTravelPolicy.findFirst as jest.Mock).mockResolvedValue({
      id: 'pol-1',
      name: 'Standard Policy',
      maxFareAmount: 5000,
      maxDistanceKm: 100,
      allowedVehicleCategories: ['SEDAN', 'SUV'],
      requireApprovalAboveAmount: 3000,
      requireApprovalAllRides: false,
    });

    const result = await evaluateTravelPolicy({
      organizationId: 'org-1',
      userId: 'user-1',
      estimatedFare: 6500,
      estimatedDistanceKm: 40,
      vehicleCategory: 'SEDAN',
    });

    expect(result.requiresApproval).toBe(true);
    expect(result.violations.some((v) => v.rule === 'MAX_FARE_EXCEEDED')).toBe(true);
  });
});
