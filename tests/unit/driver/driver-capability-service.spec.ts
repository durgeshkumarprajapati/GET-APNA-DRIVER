/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  setDriverVehicleCapabilities,
  getDriverVehicleCapabilities,
} from '@/modules/driver/application/services/driver-capability-service';
import { prisma } from '@/shared/database/prisma';

jest.mock('@/shared/database/prisma', () => {
  const mockDb: any = {
    driverProfile: {
      findUnique: jest.fn(),
    },
    vehicleCategory: {
      findMany: jest.fn(),
    },
    driverVehicleCapability: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };
  mockDb.$transaction = jest.fn((cb: (tx: unknown) => unknown) => cb(mockDb));
  return { prisma: mockDb };
});

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

describe('DriverCapabilityService', () => {
  const mockPrisma = prisma as unknown as {
    driverProfile: { findUnique: jest.Mock };
    vehicleCategory: { findMany: jest.Mock };
    driverVehicleCapability: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setDriverVehicleCapabilities', () => {
    it('successfully updates driver capabilities with valid category IDs', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1', userId: 'user-1' });
      mockPrisma.vehicleCategory.findMany.mockResolvedValue([
        { id: 'vc-car', code: 'CAR', name: 'Car', isActive: true },
        { id: 'vc-suv', code: 'SUV', name: 'SUV', isActive: true },
      ]);
      mockPrisma.driverVehicleCapability.findMany.mockResolvedValue([
        {
          id: 'dvc-1',
          driverProfileId: 'dp-1',
          vehicleCategoryId: 'vc-car',
          vehicleCategory: { id: 'vc-car', code: 'CAR', name: 'Car' },
        },
        {
          id: 'dvc-2',
          driverProfileId: 'dp-1',
          vehicleCategoryId: 'vc-suv',
          vehicleCategory: { id: 'vc-suv', code: 'SUV', name: 'SUV' },
        },
      ]);

      const res = await setDriverVehicleCapabilities('dp-1', ['vc-car', 'vc-suv']);

      expect(mockPrisma.driverVehicleCapability.deleteMany).toHaveBeenCalledWith({
        where: { driverProfileId: 'dp-1' },
      });
      expect(mockPrisma.driverVehicleCapability.createMany).toHaveBeenCalledWith({
        data: [
          { driverProfileId: 'dp-1', vehicleCategoryId: 'vc-car' },
          { driverProfileId: 'dp-1', vehicleCategoryId: 'vc-suv' },
        ],
      });
      expect(res).toHaveLength(2);
    });

    it('throws error if any category ID does not exist or is inactive', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1', userId: 'user-1' });
      mockPrisma.vehicleCategory.findMany.mockResolvedValue([
        { id: 'vc-car', code: 'CAR', name: 'Car', isActive: true },
      ]);

      await expect(setDriverVehicleCapabilities('dp-1', ['vc-car', 'vc-invalid'])).rejects.toThrow(
        'Invalid or inactive vehicle category selection: vc-invalid',
      );
    });

    it('throws error if driver profile is not found', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue(null);

      await expect(setDriverVehicleCapabilities('dp-nonexistent', ['vc-car'])).rejects.toThrow(
        "Driver profile with ID 'dp-nonexistent' not found.",
      );
    });
  });

  describe('getDriverVehicleCapabilities', () => {
    it('returns empty array when driver has no declared capabilities', async () => {
      mockPrisma.driverVehicleCapability.findMany.mockResolvedValue([]);

      const caps = await getDriverVehicleCapabilities('dp-1');

      expect(caps).toEqual([]);
    });

    it('returns mapped category capabilities when driver has declared capabilities', async () => {
      mockPrisma.driverVehicleCapability.findMany.mockResolvedValue([
        {
          id: 'dvc-1',
          driverProfileId: 'dp-1',
          vehicleCategoryId: 'vc-truck',
          vehicleCategory: {
            id: 'vc-truck',
            code: 'TRUCK',
            name: 'Truck',
            description: 'Commercial truck',
            iconUrl: null,
            displayOrder: 5,
            isActive: true,
          },
        },
      ]);

      const caps = await getDriverVehicleCapabilities('dp-1');

      expect(caps).toHaveLength(1);
      expect(caps[0].vehicleCategory.code).toBe('TRUCK');
    });
  });
});
