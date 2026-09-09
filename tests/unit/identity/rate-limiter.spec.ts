import { checkRateLimit } from '@/shared/rate-limit/rate-limiter';
import { redis } from '@/shared/redis/client';

jest.mock('@/shared/redis/client', () => ({
  redis: {
    incr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
  },
}));

describe('Rate Limiter', () => {
  const mockedIncr = redis.incr as unknown as jest.Mock;
  const mockedExpire = redis.expire as unknown as jest.Mock;
  const mockedTtl = redis.ttl as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows requests within rate limit and sets TTL on first hit', async () => {
    mockedIncr.mockResolvedValue(1);
    mockedExpire.mockResolvedValue(1);
    mockedTtl.mockResolvedValue(60);

    const result = await checkRateLimit('login', '127.0.0.1', 5, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(mockedIncr).toHaveBeenCalledWith('rate_limit:login:127.0.0.1');
    expect(mockedExpire).toHaveBeenCalledWith('rate_limit:login:127.0.0.1', 60);
  });

  it('blocks requests when count exceeds limit', async () => {
    mockedIncr.mockResolvedValue(6);
    mockedTtl.mockResolvedValue(45);

    const result = await checkRateLimit('login', '127.0.0.1', 5, 60);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('fails safe open when redis encounters error', async () => {
    mockedIncr.mockRejectedValue(new Error('Redis connection failed'));

    const result = await checkRateLimit('login', '127.0.0.1', 5, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });
});
