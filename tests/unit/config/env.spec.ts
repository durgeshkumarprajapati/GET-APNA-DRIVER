import { validateEnv } from '@/shared/config/env';

describe('validateEnv', () => {
  const baseConfig = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
  };

  it('applies defaults for optional variables', () => {
    const result = validateEnv(baseConfig);
    expect(result.NODE_ENV).toBe('development');
    expect(result.LOG_LEVEL).toBe('info');
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => validateEnv({ REDIS_URL: baseConfig.REDIS_URL })).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('throws when DATABASE_URL is not a valid URL', () => {
    expect(() => validateEnv({ ...baseConfig, DATABASE_URL: 'not-a-url' })).toThrow();
  });

  it('rejects an unknown NODE_ENV value', () => {
    expect(() => validateEnv({ ...baseConfig, NODE_ENV: 'staging' })).toThrow();
  });
});
