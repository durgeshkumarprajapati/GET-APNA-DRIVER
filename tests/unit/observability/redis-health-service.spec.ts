import { RedisHealthService } from '@/modules/observability/health/redis-health-service';
import { redis } from '@/shared/redis/client';

jest.mock('@/shared/redis/client', () => ({
  redis: {
    ping: jest.fn(),
  },
}));

describe('RedisHealthService', () => {
  it('should return HEALTHY when redis ping returns PONG', async () => {
    (redis.ping as jest.Mock).mockResolvedValue('PONG');

    const result = await RedisHealthService.evaluateHealth();

    expect(result.status).toBe('HEALTHY');
    expect(result.score).toBe(100);
    expect(result.category).toBe('STORAGE');
  });

  it('should return CRITICAL when redis ping throws error', async () => {
    (redis.ping as jest.Mock).mockRejectedValue(new Error('Redis connection refused'));

    const result = await RedisHealthService.evaluateHealth();

    expect(result.status).toBe('CRITICAL');
    expect(result.score).toBe(0);
  });
});
