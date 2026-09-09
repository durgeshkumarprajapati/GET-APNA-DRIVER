import { ConfigValueType } from '@prisma/client';
import {
  getConfiguration,
  getString,
  getInteger,
  getBoolean,
  getDecimal,
  getJson,
  updateConfiguration,
  listConfigurations,
} from '@/shared/config/configuration-service';
import { prisma } from '@/shared/database/prisma';
import { redis } from '@/shared/redis/client';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    systemConfiguration: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
      cb({
        systemConfiguration: {
          findUnique: jest.fn(),
          upsert: jest.fn(),
        },
      }),
    ),
  },
}));

jest.mock('@/shared/redis/client', () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

describe('ConfigurationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfiguration', () => {
    it('returns cached value from Redis if present', async () => {
      const mockConfig = {
        id: 'cfg-1',
        key: 'system.app_name',
        value: 'Get Apna Driver',
        valueType: ConfigValueType.STRING,
        description: 'App name',
        category: 'system',
        isPublic: true,
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockConfig));

      const result = await getConfiguration('system.app_name');
      expect(result?.value).toBe('Get Apna Driver');
      expect(redis.get).toHaveBeenCalledWith('config:system.app_name');
      expect(prisma.systemConfiguration.findUnique).not.toHaveBeenCalled();
    });

    it('falls back to database when Redis misses and caches result in Redis', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      const mockConfig = {
        id: 'cfg-1',
        key: 'identity.otp.ttl_seconds',
        value: '300',
        valueType: ConfigValueType.INTEGER,
        description: null,
        category: 'identity',
        isPublic: false,
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.systemConfiguration.findUnique as jest.Mock).mockResolvedValueOnce(mockConfig);

      const result = await getConfiguration('identity.otp.ttl_seconds');
      expect(result?.value).toBe('300');
      expect(prisma.systemConfiguration.findUnique).toHaveBeenCalledWith({
        where: { key: 'identity.otp.ttl_seconds' },
      });
      expect(redis.setex).toHaveBeenCalledWith(
        'config:identity.otp.ttl_seconds',
        300,
        JSON.stringify(mockConfig),
      );
    });
  });

  describe('Typed getters', () => {
    it('getString returns correct value or fallback', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (prisma.systemConfiguration.findUnique as jest.Mock).mockResolvedValueOnce({
        value: 'Custom Name',
      });

      const val = await getString('system.app_name', 'Default Name');
      expect(val).toBe('Custom Name');

      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (prisma.systemConfiguration.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const fallback = await getString('non.existent', 'Default Name');
      expect(fallback).toBe('Default Name');
    });

    it('getInteger returns parsed integer or fallback', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (prisma.systemConfiguration.findUnique as jest.Mock).mockResolvedValueOnce({ value: '120' });

      const val = await getInteger('identity.otp.ttl_seconds', 300);
      expect(val).toBe(120);
    });

    it('getBoolean returns parsed boolean or fallback', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (prisma.systemConfiguration.findUnique as jest.Mock).mockResolvedValueOnce({ value: 'true' });

      const val = await getBoolean('feature.enabled', false);
      expect(val).toBe(true);
    });

    it('getDecimal returns parsed float or fallback', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (prisma.systemConfiguration.findUnique as jest.Mock).mockResolvedValueOnce({ value: '18.5' });

      const val = await getDecimal('tax.rate', 0.0);
      expect(val).toBe(18.5);
    });

    it('getJson returns parsed JSON object or fallback', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (prisma.systemConfiguration.findUnique as jest.Mock).mockResolvedValueOnce({
        value: JSON.stringify({ key: 'val' }),
      });

      const val = await getJson<{ key: string }>('json.config', { key: 'default' });
      expect(val).toEqual({ key: 'val' });
    });
  });

  describe('updateConfiguration', () => {
    it('updates DB, invalidates Redis cache, records audit log, and inserts outbox event', async () => {
      const updatedConfig = {
        id: 'cfg-1',
        key: 'identity.otp.ttl_seconds',
        value: '600',
        valueType: ConfigValueType.INTEGER,
        description: 'Updated TTL',
        category: 'identity',
        isPublic: false,
        updatedBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.$transaction as jest.Mock).mockImplementationOnce(async (cb) => {
        const tx = {
          systemConfiguration: {
            findUnique: jest.fn().mockResolvedValue({
              key: 'identity.otp.ttl_seconds',
              value: '300',
              isPublic: false,
            }),
            upsert: jest.fn().mockResolvedValue(updatedConfig),
          },
        };
        return cb(tx);
      });

      const res = await updateConfiguration('user-123', {
        key: 'identity.otp.ttl_seconds',
        value: '600',
        valueType: ConfigValueType.INTEGER,
      });

      expect(res.value).toBe('600');
      expect(redis.del).toHaveBeenCalledWith('config:identity.otp.ttl_seconds');
      expect(recordAuditLog).toHaveBeenCalled();
      expect(insertOutboxEvent).toHaveBeenCalled();
    });
  });

  describe('listConfigurations', () => {
    it('queries systemConfiguration findMany with category filter', async () => {
      (prisma.systemConfiguration.findMany as jest.Mock).mockResolvedValueOnce([]);

      await listConfigurations('identity');
      expect(prisma.systemConfiguration.findMany).toHaveBeenCalledWith({
        where: { category: 'identity' },
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
      });
    });
  });
});
