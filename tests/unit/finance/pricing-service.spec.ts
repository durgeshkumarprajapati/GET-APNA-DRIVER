jest.mock('@/shared/database/prisma', () => ({ prisma: {} }));

jest.mock('@/shared/config/configuration-service', () => ({
  getString: jest.fn(),
}));

import {
  calculateBookingAmount,
  calculateCommission,
} from '@/modules/finance/application/services/pricing-service';
import { getString } from '@/shared/config/configuration-service';

const mockedGetString = getString as jest.Mock;

describe('calculateCommission', () => {
  afterEach(() => jest.clearAllMocks());

  it('splits a captured amount into commission and driver earnings that sum exactly to the gross', async () => {
    mockedGetString.mockResolvedValue('20.0000');

    const result = await calculateCommission('150.0000');

    expect(result.commissionAmount).toBe('30.0000');
    expect(result.driverEarningsAmount).toBe('120.0000');
    // The split must always reconcile exactly, or the capture ledger posting would not balance.
    expect(Number(result.commissionAmount) + Number(result.driverEarningsAmount)).toBeCloseTo(
      150,
      4,
    );
  });

  it('handles an amount that does not divide evenly without losing a paise', async () => {
    mockedGetString.mockResolvedValue('15.0000');

    const result = await calculateCommission('100.0100');

    // 100.01 * 0.15 = 15.0015 -> rounds to 15.0015? scale is 4dp so exact.
    expect(result.commissionAmount).toBe('15.0015');
    expect(result.driverEarningsAmount).toBe('85.0085');
    expect((Number(result.commissionAmount) + Number(result.driverEarningsAmount)).toFixed(4)).toBe(
      '100.0100',
    );
  });

  it('snapshots the commission percentage used, independent of later configuration reads', async () => {
    mockedGetString.mockResolvedValueOnce('10.0000');
    const first = await calculateCommission('100.0000');
    expect(first.commissionPercentage).toBe('10.0000');
    expect(first.commissionAmount).toBe('10.0000');

    // Configuration changes afterwards...
    mockedGetString.mockResolvedValueOnce('25.0000');
    const second = await calculateCommission('100.0000');
    expect(second.commissionPercentage).toBe('25.0000');
    expect(second.commissionAmount).toBe('25.0000');

    // ...but the first result, already returned and meant to be persisted as
    // a snapshot on the Payment record, is untouched by the later change.
    expect(first.commissionPercentage).toBe('10.0000');
  });
});

describe('calculateBookingAmount', () => {
  afterEach(() => jest.clearAllMocks());

  it('charges base fare plus per-minute rate for a booking with a known duration', async () => {
    mockedGetString
      .mockResolvedValueOnce('100.0000') // base fare
      .mockResolvedValueOnce('5.0000') // per-minute rate
      .mockResolvedValueOnce('100.0000'); // minimum fare

    const result = await calculateBookingAmount({ estimatedDurationMinutes: 30 });

    expect(result.amount).toBe('250.0000'); // 100 + 5*30
  });

  it('falls back to the minimum fare when it would otherwise charge less', async () => {
    mockedGetString
      .mockResolvedValueOnce('10.0000')
      .mockResolvedValueOnce('1.0000')
      .mockResolvedValueOnce('100.0000');

    const result = await calculateBookingAmount({ estimatedDurationMinutes: 5 });

    expect(result.amount).toBe('100.0000');
  });

  it('charges just the base fare when duration is unknown', async () => {
    mockedGetString
      .mockResolvedValueOnce('100.0000')
      .mockResolvedValueOnce('5.0000')
      .mockResolvedValueOnce('50.0000');

    const result = await calculateBookingAmount({ estimatedDurationMinutes: null });

    expect(result.amount).toBe('100.0000');
  });
});
