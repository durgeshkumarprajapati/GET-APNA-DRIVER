import type { AIConfig } from './ai-types';

export function getAIConfig(): AIConfig {
  const enabled = process.env.AI_ENABLED !== 'false'; // Default enabled unless explicitly false
  const customerEnabled = process.env.AI_CUSTOMER_ENABLED !== 'false';
  const driverEnabled = process.env.AI_DRIVER_ENABLED !== 'false';
  const providerRaw = (process.env.AI_PROVIDER || 'development').toLowerCase();
  
  const provider: 'development' | 'gemini' | 'openai' = 
    providerRaw === 'gemini' ? 'gemini' : 
    providerRaw === 'openai' ? 'openai' : 'development';

  return {
    enabled,
    customerEnabled,
    driverEnabled,
    provider,
    model: process.env.AI_MODEL || 'gemini-1.5-flash',
    apiKey: process.env.AI_API_KEY,
    maxTokens: Number(process.env.AI_MAX_TOKENS) || 1000,
    temperature: Number(process.env.AI_TEMPERATURE) || 0.2,
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 15000,
    customerRateLimitPerMinute: Number(process.env.AI_CUSTOMER_RATE_LIMIT_PER_MINUTE) || 15,
    driverRateLimitPerMinute: Number(process.env.AI_DRIVER_RATE_LIMIT_PER_MINUTE) || 20,
    maxMessageLength: Number(process.env.AI_MAX_MESSAGE_LENGTH) || 1000,
    maxContextItems: Number(process.env.AI_MAX_CONTEXT_ITEMS) || 10,
  };
}
