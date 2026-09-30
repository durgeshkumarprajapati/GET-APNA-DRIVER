jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    driverProfile: {
      findMany: jest.fn(),
    },
    driverCurrentLocation: {
      findMany: jest.fn(),
    },
    marketplaceZone: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  isDriverDispatchEligible: jest.fn().mockResolvedValue({ isEligible: true, reasons: [] }),
}));

import { prisma } from '@/shared/database/prisma';
import { getSupplyMetrics } from '@/modules/marketplace-intelligence/domain/supply-service';

describe('getSupplyMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.marketplaceZone.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.driverCurrentLocation.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('never queries the non-existent DriverProfile.vehicleCategory scalar field', async () => {
    (prisma.driverProfile.findMany as jest.Mock).mockResolvedValue([]);

    await getSupplyMetrics(undefined, 'SEDAN');

    const callArgs = (prisma.driverProfile.findMany as jest.Mock).mock.calls[0][0];
    expect(callArgs.where).not.toHaveProperty('vehicleCategory');
    expect(callArgs.select).not.toHaveProperty('vehicleCategory');
    // The correct, existing relation: DriverProfile -> DriverVehicleCapability -> VehicleCategory.
    expect(callArgs.where.vehicleCapabilities).toEqual({
      some: { vehicleCategory: { code: 'SEDAN' } },
    });
  });

  it('counts online/available/busy/offline drivers correctly from real query results', async () => {
    (prisma.driverProfile.findMany as jest.Mock).mockResolvedValue([
      { id: 'd1', availabilityStatus: 'AVAILABLE' },
      { id: 'd2', availabilityStatus: 'AVAILABLE' },
      { id: 'd3', availabilityStatus: 'BUSY' },
      { id: 'd4', availabilityStatus: 'OFFLINE' },
    ]);

    const result = await getSupplyMetrics();

    expect(result.totalDrivers).toBe(4);
    expect(result.availableDrivers).toBe(2);
    expect(result.busyDrivers).toBe(1);
    expect(result.offlineDrivers).toBe(1);
    expect(result.onlineDrivers).toBe(3);
    expect(result.dispatchEligibleDrivers).toBe(2);
  });

  it('computes a sane supply/demand ratio when demand is provided', async () => {
    (prisma.driverProfile.findMany as jest.Mock).mockResolvedValue([
      { id: 'd1', availabilityStatus: 'AVAILABLE' },
      { id: 'd2', availabilityStatus: 'AVAILABLE' },
    ]);

    const result = await getSupplyMetrics(undefined, undefined, 4);

    expect(result.supplyDemandRatio).toBe(0.5);
  });

  it('degrades gracefully (empty result, no throw) when the driver query fails', async () => {
    (prisma.driverProfile.findMany as jest.Mock).mockRejectedValue(new Error('db down'));

    const result = await getSupplyMetrics();

    expect(result.totalDrivers).toBe(0);
    expect(result.dispatchEligibleDrivers).toBe(0);
  });
});
