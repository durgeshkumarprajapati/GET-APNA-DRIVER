import 'server-only';
import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
      : undefined,
  // Defense in depth: no call site should ever pass these fields, but a
  // redaction rule ensures a mistake never actually lands raw secrets in
  // log output (the dev-only OTP/token providers previously did exactly
  // this — see infrastructure/otp-provider.ts, infrastructure/email-provider.ts).
  redact: {
    paths: [
      'password',
      'passwordHash',
      '*.password',
      '*.passwordHash',
      'sessionToken',
      '*.sessionToken',
      'devOtp',
      '*.devOtp',
      'otp',
      '*.otp',
      'verificationToken',
      '*.verificationToken',
      'resetToken',
      '*.resetToken',
      'razorpayKeySecret',
      '*.razorpayKeySecret',
      'vapidPrivateKey',
      '*.vapidPrivateKey',
      'webhookPayload',
      '*.webhookPayload',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
});

export interface RequestLogContext {
  requestId: string;
  method: string;
  route: string;
  userId?: string;
  statusCode?: number;
  durationMs?: number;
  errorCode?: string;
}

/** Binds a request's correlation ID (and other stable fields) to every subsequent log line from it. */
export function createRequestLogger(context: RequestLogContext) {
  return logger.child(context);
}
