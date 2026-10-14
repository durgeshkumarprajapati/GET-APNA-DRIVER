jest.mock('@/shared/config/env', () => ({
  env: {
    RAZORPAY_KEY_ID: 'rzp_test_key',
    RAZORPAY_KEY_SECRET: 'rzp_test_secret',
    RAZORPAY_WEBHOOK_SECRET: 'rzp_test_webhook_secret',
  },
}));

import { DependencyHealthService } from '@/modules/observability/health/dependency-health-service';
import { env } from '@/shared/config/env';

const mockEnv = env as unknown as Record<string, string | undefined>;

describe('DependencyHealthService — real Razorpay check, not a hardcoded "always HEALTHY" entry', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    mockEnv.RAZORPAY_KEY_ID = 'rzp_test_key';
    mockEnv.RAZORPAY_KEY_SECRET = 'rzp_test_secret';
    mockEnv.RAZORPAY_WEBHOOK_SECRET = 'rzp_test_webhook_secret';
  });

  it('reports CRITICAL, not a fabricated HEALTHY, when Razorpay credentials are not configured', async () => {
    mockEnv.RAZORPAY_KEY_ID = undefined;
    mockEnv.RAZORPAY_KEY_SECRET = undefined;

    const result = await DependencyHealthService.evaluateHealth();
    const payment = result.dependencies.find((d) => d.type === 'PAYMENT');

    expect(payment?.status).toBe('CRITICAL');
    expect(payment?.details?.configured).toBe(false);
  });

  it('performs a real authenticated call and reports HEALTHY with the real measured latency', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] }),
      }) as unknown as typeof fetch;

    const result = await DependencyHealthService.evaluateHealth();
    const payment = result.dependencies.find((d) => d.type === 'PAYMENT');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.razorpay.com/v1/payments?count=1',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.stringContaining('Basic') }),
      }),
    );
    expect(payment?.status).toBe('HEALTHY');
    expect(typeof payment?.latencyMs).toBe('number');
    expect(payment?.details?.webhooksActive).toBe(true);
  });

  it('reports CRITICAL when Razorpay responds with a non-OK status, never a fabricated success', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      }) as unknown as typeof fetch;

    const result = await DependencyHealthService.evaluateHealth();
    const payment = result.dependencies.find((d) => d.type === 'PAYMENT');

    expect(payment?.status).toBe('CRITICAL');
  });

  it('reports CRITICAL when Razorpay is unreachable, never a fabricated success', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network error')) as unknown as typeof fetch;

    const result = await DependencyHealthService.evaluateHealth();
    const payment = result.dependencies.find((d) => d.type === 'PAYMENT');

    expect(payment?.status).toBe('CRITICAL');
    expect(payment?.details?.error).toBe('unreachable');
  });
});
