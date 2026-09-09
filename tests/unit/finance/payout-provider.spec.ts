import { DevelopmentPayoutProvider } from '@/modules/finance/infrastructure/payout-provider';

describe('DevelopmentPayoutProvider', () => {
  const provider = new DevelopmentPayoutProvider();

  it('initiates a deterministic simulated payout with no real network call', async () => {
    const result = await provider.initiatePayout({
      settlementId: 'settlement-1',
      driverProfileId: 'driver-profile-1',
      amountMinorUnits: 500000,
      currency: 'INR',
    });

    expect(result.payoutReference).toMatch(/^DEV-PAYOUT-/);
    expect(result.status).toBe('PROCESSING');
    expect(result.providerName).toBe('development');
  });

  it('issues a distinct reference for every payout', async () => {
    const first = await provider.initiatePayout({
      settlementId: 'settlement-1',
      driverProfileId: 'driver-profile-1',
      amountMinorUnits: 500000,
      currency: 'INR',
    });
    const second = await provider.initiatePayout({
      settlementId: 'settlement-2',
      driverProfileId: 'driver-profile-1',
      amountMinorUnits: 500000,
      currency: 'INR',
    });

    expect(first.payoutReference).not.toBe(second.payoutReference);
  });

  it('reports a completed status for any reference', async () => {
    const status = await provider.getPayoutStatus('DEV-PAYOUT-anything');
    expect(status.status).toBe('COMPLETED');
  });
});
