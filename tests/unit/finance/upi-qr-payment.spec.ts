// A fully static factory — see oauth-provider.spec.ts for why this can't
// close over a local variable. Tests mutate fields via jest.requireMock.
jest.mock('@/shared/config/env', () => ({
  env: {
    RAZORPAY_KEY_ID: 'rzp_test_key',
    RAZORPAY_KEY_SECRET: 'rzp_test_secret',
    RAZORPAY_WEBHOOK_SECRET: 'rzp_test_webhook_secret',
    RAZORPAY_PAYMENT_PAGE: undefined,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  },
}));

import {
  RazorpayPaymentProvider,
  MockPaymentProvider,
} from '@/modules/finance/infrastructure/payment-provider';

describe('Razorpay UPI QR Code integration — real scannable code, never a decorative fake', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('RazorpayPaymentProvider.createUpiQrCode', () => {
    it('calls the real Razorpay QR Code API and returns the hosted scannable image URL', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'qr_live_abc123',
          entity: 'qr_code',
          status: 'active',
          image_url: 'https://rzp.io/i/real-qr-image',
        }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const provider = new RazorpayPaymentProvider();
      const result = await provider.createUpiQrCode({
        amountMinorUnits: 20000,
        description: 'Trip payment',
        notes: { bookingId: 'bkg-1' },
      });

      expect(result).toEqual({
        providerQrCodeId: 'qr_live_abc123',
        imageUrl: 'https://rzp.io/i/real-qr-image',
        status: 'active',
      });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.razorpay.com/v1/payments/qr_codes');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toContain('Basic');
      const body = JSON.parse(init.body);
      expect(body).toMatchObject({
        type: 'upi_qr',
        usage: 'single_use',
        fixed_amount: true,
        payment_amount: 20000,
      });
    });

    it('throws when Razorpay rejects the request, rather than fabricating a fallback QR', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ error: { description: 'Invalid amount' } }),
      }) as unknown as typeof fetch;

      const provider = new RazorpayPaymentProvider();
      await expect(
        provider.createUpiQrCode({ amountMinorUnits: 0, description: 'x' }),
      ).rejects.toThrow('Invalid amount');
    });
  });

  describe('RazorpayPaymentProvider.closeUpiQrCode', () => {
    it('posts to the real close endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
      global.fetch = fetchMock as unknown as typeof fetch;

      const provider = new RazorpayPaymentProvider();
      await provider.closeUpiQrCode('qr_live_abc123');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.razorpay.com/v1/payments/qr_codes/qr_live_abc123/close',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('never throws on a provider-side close failure — best-effort only', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { description: 'Already closed' } }),
      }) as unknown as typeof fetch;

      const provider = new RazorpayPaymentProvider();
      await expect(provider.closeUpiQrCode('qr_already_closed')).resolves.toBeUndefined();
    });
  });

  describe('MockPaymentProvider (dev/test — no network calls)', () => {
    it('generates a deterministic mock QR code without hitting the network', async () => {
      const provider = new MockPaymentProvider();
      const result = await provider.createUpiQrCode({
        amountMinorUnits: 10000,
        description: 'Trip payment',
      });

      expect(result.providerQrCodeId).toMatch(/^qr_mock_/);
      expect(result.imageUrl).toContain(result.providerQrCodeId);
      expect(result.status).toBe('active');
    });

    it('closeUpiQrCode resolves without error', async () => {
      const provider = new MockPaymentProvider();
      await expect(provider.closeUpiQrCode('qr_mock_x')).resolves.toBeUndefined();
    });
  });
});
