jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    systemConfiguration: { findUnique: jest.fn() },
  },
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getConfiguration: jest.fn(),
  updateConfiguration: jest.fn(),
}));

jest.mock('@/shared/audit/audit-service', () => ({
  listAuditLogs: jest.fn(),
}));

import {
  getCommissionPolicy,
  updateCommissionPolicy,
  getCommissionPolicyHistory,
  InvalidCommissionPercentageError,
} from '@/modules/finance/application/services/commission-policy-service';
import { prisma } from '@/shared/database/prisma';
import { getConfiguration, updateConfiguration } from '@/shared/config/configuration-service';
import { listAuditLogs } from '@/shared/audit/audit-service';

const mockedPrisma = prisma as unknown as {
  systemConfiguration: { findUnique: jest.Mock };
};
const mockedGetConfiguration = getConfiguration as jest.Mock;
const mockedUpdateConfiguration = updateConfiguration as jest.Mock;
const mockedListAuditLogs = listAuditLogs as jest.Mock;

describe('getCommissionPolicy', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns the configured platform commission percentage', async () => {
    mockedGetConfiguration.mockResolvedValue({
      value: '25.0000',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedBy: 'admin-1',
    });

    const policy = await getCommissionPolicy();

    expect(policy.percentage).toBe('25.0000');
    expect(policy.updatedBy).toBe('admin-1');
  });

  it('falls back to the default rate when no configuration row exists yet', async () => {
    mockedGetConfiguration.mockResolvedValue(null);

    const policy = await getCommissionPolicy();

    expect(policy.percentage).toBe('20.0000');
    expect(policy.updatedBy).toBeNull();
  });
});

describe('updateCommissionPolicy', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects a non-numeric percentage', async () => {
    await expect(updateCommissionPolicy('admin-1', 'not-a-number')).rejects.toThrow(
      InvalidCommissionPercentageError,
    );
    expect(mockedUpdateConfiguration).not.toHaveBeenCalled();
  });

  it('rejects a negative percentage', async () => {
    await expect(updateCommissionPolicy('admin-1', '-5')).rejects.toThrow(
      InvalidCommissionPercentageError,
    );
    expect(mockedUpdateConfiguration).not.toHaveBeenCalled();
  });

  it('rejects a percentage above 100', async () => {
    await expect(updateCommissionPolicy('admin-1', '150')).rejects.toThrow(
      InvalidCommissionPercentageError,
    );
    expect(mockedUpdateConfiguration).not.toHaveBeenCalled();
  });

  it('delegates a valid percentage to the existing configuration-update path (audit + cache invalidation included)', async () => {
    mockedUpdateConfiguration.mockResolvedValue({
      value: '30.0000',
      updatedAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedBy: 'admin-1',
    });

    const result = await updateCommissionPolicy('admin-1', '30');

    expect(mockedUpdateConfiguration).toHaveBeenCalledWith(
      'admin-1',
      expect.objectContaining({
        key: 'finance.platform_commission_percentage',
        value: '30.0000',
      }),
      undefined,
      prisma,
    );
    expect(result.percentage).toBe('30.0000');
  });
});

describe('getCommissionPolicyHistory', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns an empty history when no configuration row has ever been created', async () => {
    mockedPrisma.systemConfiguration.findUnique.mockResolvedValue(null);

    const history = await getCommissionPolicyHistory();

    expect(history.entries).toEqual([]);
    expect(mockedListAuditLogs).not.toHaveBeenCalled();
  });

  it('queries the audit log scoped to the commission configuration row, never recomputing history from live config', async () => {
    mockedPrisma.systemConfiguration.findUnique.mockResolvedValue({ id: 'config-row-1' });
    mockedListAuditLogs.mockResolvedValue({
      entries: [{ id: 'audit-1', action: 'configuration.updated' }],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    const history = await getCommissionPolicyHistory();

    expect(mockedListAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SystemConfiguration', entityId: 'config-row-1' }),
      prisma,
    );
    expect(history.entries).toHaveLength(1);
  });
});
