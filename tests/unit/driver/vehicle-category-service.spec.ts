import {
  createVehicleCategory,
  listVehicleCategories,
  deleteOrDeactivateVehicleCategory,
} from '@/modules/driver/application/services/vehicle-category-service';
import { prisma } from '@/shared/database/prisma';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    vehicleCategory: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

describe('VehicleCategoryService', () => {
  const mockPrisma = prisma as unknown as {
    vehicleCategory: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createVehicleCategory', () => {
    it('creates a new vehicle category with uppercase code', async () => {
      mockPrisma.vehicleCategory.findUnique.mockResolvedValue(null);
      mockPrisma.vehicleCategory.create.mockResolvedValue({
        id: 'vc-1',
        code: 'LUXURY_SUV',
        name: 'Luxury SUV',
        description: 'Premium SUV vehicles',
        iconUrl: null,
        displayOrder: 1,
        isActive: true,
      });

      const result = await createVehicleCategory('admin-1', {
        code: 'luxury_suv',
        name: 'Luxury SUV',
        description: 'Premium SUV vehicles',
      });

      expect(mockPrisma.vehicleCategory.findUnique).toHaveBeenCalledWith({
        where: { code: 'LUXURY_SUV' },
      });
      expect(mockPrisma.vehicleCategory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'LUXURY_SUV',
          name: 'Luxury SUV',
        }),
      });
      expect(result.code).toBe('LUXURY_SUV');
    });

    it('throws error if category code already exists', async () => {
      mockPrisma.vehicleCategory.findUnique.mockResolvedValue({
        id: 'vc-existing',
        code: 'SUV',
        name: 'SUV',
      });

      await expect(
        createVehicleCategory('admin-1', {
          code: 'SUV',
          name: 'SUV Category',
        }),
      ).rejects.toThrow("Vehicle category code 'SUV' already exists.");
    });
  });

  describe('listVehicleCategories', () => {
    it('returns all active categories when activeOnly is true', async () => {
      mockPrisma.vehicleCategory.findMany.mockResolvedValue([
        { id: 'vc-1', code: 'MINI_CAR', name: 'Mini Car', isActive: true },
        { id: 'vc-2', code: 'CAR', name: 'Car', isActive: true },
      ]);

      const categories = await listVehicleCategories(true);

      expect(mockPrisma.vehicleCategory.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      });
      expect(categories).toHaveLength(2);
    });
  });

  describe('deleteOrDeactivateVehicleCategory', () => {
    it('hard deletes category if zero capabilities and zero bookings reference it', async () => {
      mockPrisma.vehicleCategory.findUnique.mockResolvedValue({
        id: 'vc-1',
        name: 'Mini Car',
        code: 'MINI_CAR',
        _count: { driverCapabilities: 0, bookings: 0 },
      });
      mockPrisma.vehicleCategory.delete.mockResolvedValue({ id: 'vc-1' });

      const res = await deleteOrDeactivateVehicleCategory('admin-1', 'vc-1');

      expect(mockPrisma.vehicleCategory.delete).toHaveBeenCalledWith({ where: { id: 'vc-1' } });
      expect(res.action).toBe('DELETED');
    });

    it('soft deactivates category if driverCapabilities or bookings reference it', async () => {
      mockPrisma.vehicleCategory.findUnique.mockResolvedValue({
        id: 'vc-1',
        name: 'Car',
        code: 'CAR',
        _count: { driverCapabilities: 3, bookings: 12 },
      });
      mockPrisma.vehicleCategory.update.mockResolvedValue({
        id: 'vc-1',
        isActive: false,
      });

      const res = await deleteOrDeactivateVehicleCategory('admin-1', 'vc-1');

      expect(mockPrisma.vehicleCategory.update).toHaveBeenCalledWith({
        where: { id: 'vc-1' },
        data: { isActive: false },
      });
      expect(res.action).toBe('DEACTIVATED');
    });
  });
});
