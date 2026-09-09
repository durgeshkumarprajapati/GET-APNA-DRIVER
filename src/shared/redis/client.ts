import 'server-only';
import Redis from 'ioredis';
import { env } from '../config/env';

declare global {
  var __redis: Redis | undefined;
}

export const redis =
  globalThis.__redis ??
  new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  });

if (env.NODE_ENV !== 'production') {
  globalThis.__redis = redis;
}
