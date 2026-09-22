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
    // Every call site in this codebase already treats Redis as a
    // best-effort cache and falls back to Postgres on any error (see
    // configuration-service.ts, rbac-cache.ts, etc.) — but that fallback
    // only helps if a failed command actually *fails* promptly. ioredis's
    // defaults (unbounded reconnect retries with backoff, a long OS-level
    // TCP connect timeout) mean a genuinely unreachable Redis previously
    // left every one of those "graceful" call sites hanging for seconds
    // before the catch block ever ran — turning an optional cache outage
    // into app-wide latency, and (in test environments without a real
    // Redis) into exactly this class of "mysterious" timeout across
    // unrelated test suites. Bounded here so a command against a dead
    // Redis fails fast and the existing fallback logic actually gets to
    // do its job quickly.
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => (times > 2 ? null : Math.min(times * 200, 1000)),
  });

if (env.NODE_ENV !== 'production') {
  globalThis.__redis = redis;
}
