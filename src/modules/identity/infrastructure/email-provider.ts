import 'server-only';
import { env } from '@/shared/config/env';
import { logger } from '@/shared/logging/logger';

export interface EmailDeliveryProvider {
  sendVerificationEmail(email: string, token: string): Promise<void>;
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
}

export class DevelopmentEmailDeliveryProvider implements EmailDeliveryProvider {
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    logger.info({ email, verificationToken: token }, '[DEV ONLY] Verification email requested');
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    logger.info({ email, resetToken: token }, '[DEV ONLY] Password reset email requested');
  }
}

export class ProductionEmailProvider implements EmailDeliveryProvider {
  async sendVerificationEmail(email: string, _token: string): Promise<void> {
    logger.info({ email }, 'Production verification email dispatch requested');
  }

  async sendPasswordResetEmail(email: string, _token: string): Promise<void> {
    logger.info({ email }, 'Production password reset email dispatch requested');
  }
}

export const emailDeliveryProvider: EmailDeliveryProvider =
  env.NODE_ENV === 'production'
    ? new ProductionEmailProvider()
    : new DevelopmentEmailDeliveryProvider();
