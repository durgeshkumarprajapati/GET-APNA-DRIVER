import { ThemePreference } from '@prisma/client';
import {
  getOrCreateCustomerPreference,
  updateCustomerPreference,
} from '@/modules/customer/application/customer-preference-service';
import { prisma } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    customerPreference: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
      cb({
        customerPreference: {
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

describe('CustomerPreferenceService', () => {
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateCustomerPreference', () => {
    it('returns existing preference if found', async () => {
      const mockPref = { id: 'pref-1', userId, theme: ThemePreference.LIGHT };
      (prisma.customerPreference.findUnique as jest.Mock).mockResolvedValueOnce(mockPref);

      const result = await getOrCreateCustomerPreference(userId);
      expect(result).toEqual(mockPref);
      expect(prisma.customerPreference.create).not.toHaveBeenCalled();
    });

    it('creates default preference if not found', async () => {
      (prisma.customerPreference.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const newPref = {
        id: 'pref-2',
        userId,
        theme: ThemePreference.SYSTEM,
        language: 'en',
        pushNotificationsEnabled: true,
        smsNotificationsEnabled: true,
        emailNotificationsEnabled: true,
      };
      (prisma.customerPreference.create as jest.Mock).mockResolvedValueOnce(newPref);

      const result = await getOrCreateCustomerPreference(userId);
      expect(result).toEqual(newPref);
      expect(prisma.customerPreference.create).toHaveBeenCalled();
    });
  });

  describe('updateCustomerPreference', () => {
    it('updates customer preference fields, records audit log, and inserts outbox event', async () => {
      const currentPref = {
        id: 'pref-1',
        userId,
        theme: ThemePreference.SYSTEM,
        language: 'en',
        pushNotificationsEnabled: true,
        smsNotificationsEnabled: true,
        emailNotificationsEnabled: true,
      };
      const updatedPref = {
        ...currentPref,
        theme: ThemePreference.DARK,
        language: 'hi',
      };

      (prisma.$transaction as jest.Mock).mockImplementationOnce(async (cb) => {
        const tx = {
          customerPreference: {
            findUnique: jest.fn().mockResolvedValue(currentPref),
            update: jest.fn().mockResolvedValue(updatedPref),
          },
        };
        return cb(tx);
      });

      const res = await updateCustomerPreference(userId, {
        theme: ThemePreference.DARK,
        language: 'hi',
      });
      expect(res.theme).toBe(ThemePreference.DARK);
      expect(res.language).toBe('hi');
      expect(recordAuditLog).toHaveBeenCalled();
      expect(insertOutboxEvent).toHaveBeenCalled();
    });
  });
});
