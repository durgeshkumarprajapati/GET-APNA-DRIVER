import {
  listSavedLocations,
  createSavedLocation,
  updateSavedLocation,
  setDefaultLocation,
  deleteSavedLocation,
} from '@/modules/location/application/saved-location-service';
import { prisma } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    savedLocation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    customerProfile: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
      cb({
        savedLocation: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
          delete: jest.fn(),
        },
        customerProfile: {
          upsert: jest.fn(),
          update: jest.fn(),
        },
      }),
    ),
  },
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

describe('SavedLocationService', () => {
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listSavedLocations', () => {
    it('returns array of saved locations for user', async () => {
      (prisma.savedLocation.findMany as jest.Mock).mockResolvedValueOnce([]);
      const result = await listSavedLocations(userId);
      expect(result).toEqual([]);
      expect(prisma.savedLocation.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });

  describe('updateSavedLocation', () => {
    it('updates location details and records audit log', async () => {
      const currentLoc = { id: 'loc-1', userId, label: 'Home', isDefault: false };
      const updatedLoc = { ...currentLoc, label: 'New Home' };

      (prisma.$transaction as jest.Mock).mockImplementationOnce(async (cb) => {
        const tx = {
          savedLocation: {
            findFirst: jest.fn().mockResolvedValue(currentLoc),
            updateMany: jest.fn(),
            update: jest.fn().mockResolvedValue(updatedLoc),
          },
          customerProfile: {
            upsert: jest.fn(),
          },
        };
        return cb(tx);
      });

      const res = await updateSavedLocation(userId, 'loc-1', { label: 'New Home' });
      expect(res.label).toBe('New Home');
      expect(recordAuditLog).toHaveBeenCalled();
      expect(insertOutboxEvent).toHaveBeenCalled();
    });
  });

  describe('createSavedLocation', () => {
    it('creates location and sets as default if first location', async () => {
      const createdLoc = {
        id: 'loc-1',
        userId,
        label: 'Home',
        addressLine1: '123 MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        latitude: 12.9716,
        longitude: 77.5946,
        isDefault: true,
      };

      (prisma.$transaction as jest.Mock).mockImplementationOnce(async (cb) => {
        const tx = {
          savedLocation: {
            findMany: jest.fn().mockResolvedValue([]),
            updateMany: jest.fn(),
            create: jest.fn().mockResolvedValue(createdLoc),
          },
          customerProfile: {
            upsert: jest.fn(),
          },
        };
        return cb(tx);
      });

      const res = await createSavedLocation(userId, {
        label: 'Home',
        addressLine1: '123 MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        latitude: 12.9716,
        longitude: 77.5946,
      });

      expect(res.isDefault).toBe(true);
      expect(recordAuditLog).toHaveBeenCalled();
      expect(insertOutboxEvent).toHaveBeenCalled();
    });

    it('rejects invalid coordinates', async () => {
      await expect(
        createSavedLocation(userId, {
          label: 'Invalid',
          addressLine1: 'Street',
          city: 'City',
          state: 'State',
          postalCode: '000000',
          latitude: 100, // Invalid lat > 90
          longitude: 77.5946,
        }),
      ).rejects.toThrow(/Latitude must be between -90 and 90/);
    });
  });

  describe('setDefaultLocation', () => {
    it('unsets existing defaults and sets target location as default', async () => {
      const targetLoc = { id: 'loc-2', userId, label: 'Work', isDefault: false };
      const updatedLoc = { ...targetLoc, isDefault: true };

      (prisma.$transaction as jest.Mock).mockImplementationOnce(async (cb) => {
        const tx = {
          savedLocation: {
            findFirst: jest.fn().mockResolvedValue(targetLoc),
            updateMany: jest.fn(),
            update: jest.fn().mockResolvedValue(updatedLoc),
          },
          customerProfile: {
            upsert: jest.fn(),
          },
        };
        return cb(tx);
      });

      const res = await setDefaultLocation(userId, 'loc-2');
      expect(res.isDefault).toBe(true);
      expect(recordAuditLog).toHaveBeenCalled();
    });
  });

  describe('deleteSavedLocation', () => {
    it('deletes location and re-assigns default if deleted location was default', async () => {
      const targetLoc = { id: 'loc-1', userId, label: 'Home', isDefault: true };
      const remainingLoc = { id: 'loc-2', userId, label: 'Work', isDefault: false };

      (prisma.$transaction as jest.Mock).mockImplementationOnce(async (cb) => {
        const tx = {
          savedLocation: {
            findFirst: jest
              .fn()
              .mockResolvedValueOnce(targetLoc) // Initial find
              .mockResolvedValueOnce(remainingLoc), // Next location find
            delete: jest.fn(),
            update: jest.fn(),
          },
          customerProfile: {
            update: jest.fn(),
          },
        };
        return cb(tx);
      });

      await deleteSavedLocation(userId, 'loc-1');
      expect(recordAuditLog).toHaveBeenCalled();
    });
  });
});
