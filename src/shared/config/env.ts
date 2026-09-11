import 'server-only';
import { z } from 'zod';

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

const urlString = z.string().min(1).refine(isValidUrl, { message: 'must be a valid URL' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: urlString,
  REDIS_URL: urlString,
  AUTH_SECRET: z
    .string()
    .min(32)
    .default('dev-secret-at-least-32-characters-long-key-for-jwt-and-cookies'),
  AUTH_SESSION_COOKIE_NAME: z.string().min(1).default('gad_session'),
  AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
  TELEPHONY_PROVIDER: z.enum(['mock', 'exotel', 'twilio']).default('mock'),
  TELEPHONY_ACCOUNT_SID: z.string().optional(),
  TELEPHONY_AUTH_TOKEN: z.string().optional(),
  TELEPHONY_WEBHOOK_SECRET: z.string().optional(),
  TELEPHONY_PROXY_NUMBER: z.string().optional(),
  TELEPHONY_SUPPORT_NUMBER: z.string().optional(),
  DRIVER_CUSTOMER_CALL_WINDOW_MINUTES: z.coerce.number().int().default(30),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return result.data;
}

export const env = validateEnv(process.env);
