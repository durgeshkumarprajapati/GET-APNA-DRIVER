import {
  getOrCreateCustomerProfile,
  updateCustomerProfile,
} from '@/modules/customer/application/customer-profile-service';
import { prisma } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    customerProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
      cb({
        customerProfile: {
          findUnique: jest.fn(),
          create: jest.fn(),
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

describe('CustomerProfileService', () => {
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateCustomerProfile', () => {
    it('returns existing profile if found', async () => {
      const mockProfile = { id: 'prof-1', userId, firstName: 'John', lastName: 'Doe' };
      (prisma.customerProfile.findUnique as jest.Mock).mockResolvedValueOnce(mockProfile);

      const result = await getOrCreateCustomerProfile(userId);
      expect(result).toEqual(mockProfile);
      expect(prisma.customerProfile.create).not.toHaveBeenCalled();
    });

    it('creates profile if not found', async () => {
      (prisma.customerProfile.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const newProfile = { id: 'prof-2', userId };
      (prisma.customerProfile.create as jest.Mock).mockResolvedValueOnce(newProfile);

      const result = await getOrCreateCustomerProfile(userId);
      expect(result).toEqual(newProfile);
      expect(prisma.customerProfile.create).toHaveBeenCalledWith({ data: { userId } });
    });
  });

  describe('updateCustomerProfile', () => {
    it('updates customer profile fields, records audit log, and inserts outbox event', async () => {
      const currentProfile = { id: 'prof-1', userId, firstName: 'Old', lastName: 'Name' };
      const updatedProfile = { id: 'prof-1', userId, firstName: 'New', lastName: 'Name' };

      (prisma.$transaction as jest.Mock).mockImplementationOnce(async (cb) => {
        const tx = {
          customerProfile: {
            findUnique: jest.fn().mockResolvedValue(currentProfile),
            update: jest.fn().mockResolvedValue(updatedProfile),
          },
        };
        return cb(tx);
      });

      const res = await updateCustomerProfile(userId, { firstName: 'New' });
      expect(res.firstName).toBe('New');
      expect(recordAuditLog).toHaveBeenCalled();
      expect(insertOutboxEvent).toHaveBeenCalled();
    });

    it('throws error when dateOfBirth is in the future', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      await expect(updateCustomerProfile(userId, { dateOfBirth: futureDate })).rejects.toThrow(
        /dateOfBirth cannot be in the future/,
      );
    });
  });
});
