import {
  getCommissionPolicy,
  updateCommissionPolicy,
  InvalidCommissionPercentageError,
} from '@/modules/finance/application/services/commission-policy-service';
import { getConfiguration } from '@/shared/config/configuration-service';

jest.mock('@/shared/config/configuration-service', () => ({
  getConfiguration: jest.fn(),
  updateConfiguration: jest.fn(),
}));

describe('Commission Matrix Admin Service & Hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getCommissionPolicy safely parses updatedAt when cached as ISO string', async () => {
    (getConfiguration as jest.Mock).mockResolvedValue({
      value: '20.0000',
      updatedAt: '2026-09-15T12:00:00.000Z', // Cached string representation
      updatedBy: 'admin-1',
    });

    const policy = await getCommissionPolicy();

    expect(policy.percentage).toBe('20.0000');
    expect(policy.updatedAt).toBe('2026-09-15T12:00:00.000Z');
    expect(policy.updatedBy).toBe('admin-1');
  });

  it('getCommissionPolicy safely parses updatedAt when returned as Date instance', async () => {
    const now = new Date();
    (getConfiguration as jest.Mock).mockResolvedValue({
      value: '18.5000',
      updatedAt: now,
      updatedBy: 'admin-2',
    });

    const policy = await getCommissionPolicy();

    expect(policy.percentage).toBe('18.5000');
    expect(policy.updatedAt).toBe(now.toISOString());
  });

  it('updateCommissionPolicy rejects percentage outside 0-100 range', async () => {
    await expect(updateCommissionPolicy('user-1', '105.00')).rejects.toThrow(
      InvalidCommissionPercentageError,
    );
    await expect(updateCommissionPolicy('user-1', '-5.00')).rejects.toThrow(
      InvalidCommissionPercentageError,
    );
  });
});
