import 'server-only';
import { env } from '@/shared/config/env';
import { logger } from '@/shared/logging/logger';

export interface OtpDeliveryProvider {
  sendOtp(phoneNumber: string, otp: string): Promise<void>;
}

export class DevelopmentOtpDeliveryProvider implements OtpDeliveryProvider {
  async sendOtp(phoneNumber: string, otp: string): Promise<void> {
    const maskedPhone = phoneNumber.slice(0, 4) + '****' + phoneNumber.slice(-2);
    logger.info(
      { phoneNumber: maskedPhone, devOtp: otp },
      '[DEV ONLY] OTP generated for phone number',
    );
  }
}

export class ProductionSmsProvider implements OtpDeliveryProvider {
  async sendOtp(phoneNumber: string, _otp: string): Promise<void> {
    // Production SMS delivery service integration placeholder (e.g. Twilio / MSG91)
    logger.info({ phoneNumber }, 'Production SMS requested');
  }
}

export const otpDeliveryProvider: OtpDeliveryProvider =
  env.NODE_ENV === 'production'
    ? new ProductionSmsProvider()
    : new DevelopmentOtpDeliveryProvider();
