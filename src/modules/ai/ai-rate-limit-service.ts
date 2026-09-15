import type { AIRole } from './ai-types';
import { getAIConfig } from './ai-config';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class AIRateLimitService {
  private memoryStore = new Map<string, RateLimitRecord>();

  checkRateLimit(userId: string, role: AIRole): { allowed: boolean; retryAfterSeconds?: number } {
    const config = getAIConfig();
    const limit = role === 'CUSTOMER' ? config.customerRateLimitPerMinute : config.driverRateLimitPerMinute;
    const now = Date.now();
    const key = `${role}:${userId}`;

    const record = this.memoryStore.get(key);

    if (!record || now > record.resetAt) {
      this.memoryStore.set(key, {
        count: 1,
        resetAt: now + 60000,
      });
      return { allowed: true };
    }

    if (record.count >= limit) {
      const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
      return { allowed: false, retryAfterSeconds };
    }

    record.count += 1;
    return { allowed: true };
  }
}
