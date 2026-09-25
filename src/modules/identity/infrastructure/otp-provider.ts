import 'server-only';
import { env } from '@/shared/config/env';
import { logger } from '@/shared/logging/logger';

export interface OtpDeliveryProvider {
  sendOtp(phoneNumber: string, otp: string): Promise<void>;
}

export function maskPhoneNumber(phoneNumber: string): string {
  if (phoneNumber.length <= 6) return '***';
  return phoneNumber.slice(0, 4) + '****' + phoneNumber.slice(-2);
}

/**
 * Development OTP provider — logs masked phone number and OTP for local development.
 */
export class DevelopmentOtpDeliveryProvider implements OtpDeliveryProvider {
  async sendOtp(phoneNumber: string, otp: string): Promise<void> {
    const maskedPhone = maskPhoneNumber(phoneNumber);
    logger.info({ phoneNumber: maskedPhone }, '[DEV ONLY] OTP generated for phone number');
    // Print unredacted OTP to terminal stdout for dev verification testing
    console.log(
      `\n=========================================\n[DEV TEST OTP] Mobile: ${phoneNumber} | VERIFICATION CODE: ${otp}\n=========================================\n`,
    );
  }
}

/**
 * Mock OTP provider — used in test suites for deterministic assertions without network requests.
 */
export class MockOtpDeliveryProvider implements OtpDeliveryProvider {
  public readonly sentMessages: Array<{ phoneNumber: string; otp: string; sentAt: Date }> = [];

  async sendOtp(phoneNumber: string, otp: string): Promise<void> {
    this.sentMessages.push({ phoneNumber, otp, sentAt: new Date() });
  }

  getLastOtp(phoneNumber: string): string | undefined {
    const found = [...this.sentMessages].reverse().find((msg) => msg.phoneNumber === phoneNumber);
    return found?.otp;
  }

  clear(): void {
    this.sentMessages.length = 0;
  }
}

/**
 * Production Twilio SMS provider integration.
 */
export class TwilioSmsProvider implements OtpDeliveryProvider {
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;

  constructor(accountSid?: string, authToken?: string, fromNumber?: string) {
    this.accountSid = accountSid || env.TWILIO_ACCOUNT_SID || '';
    this.authToken = authToken || env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = fromNumber || env.TWILIO_FROM_NUMBER || '';
  }

  async sendOtp(phoneNumber: string, otp: string): Promise<void> {
    const maskedPhone = maskPhoneNumber(phoneNumber);

    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      logger.warn(
        { phoneNumber: maskedPhone },
        'Twilio SMS credentials missing in environment variables. Falling back to development log.',
      );
      const devProvider = new DevelopmentOtpDeliveryProvider();
      await devProvider.sendOtp(phoneNumber, otp);
      return;
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: phoneNumber,
      From: this.fromNumber,
      Body: `Your GET APNA DRIVER verification code is: ${otp}. Valid for 3 minutes. Do not share this code.`,
    });

    const authHeader = `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.error(
          { phoneNumber: maskedPhone, status: response.status, errorText: errText },
          'Failed to send SMS via Twilio API',
        );
        throw new Error(`Twilio SMS delivery failed with status ${response.status}`);
      }

      logger.info(
        { phoneNumber: maskedPhone, provider: 'twilio' },
        'OTP SMS sent successfully via Twilio',
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('Twilio SMS delivery failed')) {
        throw err;
      }
      logger.error({ phoneNumber: maskedPhone, err }, 'Network failure during Twilio SMS dispatch');
      throw new Error('SMS delivery failed due to network error');
    }
  }
}

/**
 * Production MSG91 SMS provider integration.
 */
export class Msg91SmsProvider implements OtpDeliveryProvider {
  private readonly authKey: string;
  private readonly templateId: string;

  constructor(authKey?: string, templateId?: string) {
    this.authKey = authKey || env.MSG91_AUTH_KEY || '';
    this.templateId = templateId || env.MSG91_TEMPLATE_ID || '';
  }

  async sendOtp(phoneNumber: string, otp: string): Promise<void> {
    const maskedPhone = maskPhoneNumber(phoneNumber);

    if (!this.authKey) {
      logger.warn(
        { phoneNumber: maskedPhone },
        'MSG91 auth key missing in environment variables. Falling back to development log.',
      );
      const devProvider = new DevelopmentOtpDeliveryProvider();
      await devProvider.sendOtp(phoneNumber, otp);
      return;
    }

    const url = 'https://control.msg91.com/api/v5/otp';
    const mobileDigits = phoneNumber.replace(/\D/g, '');

    const payload: Record<string, unknown> = {
      mobile: mobileDigits,
      otp: otp,
    };
    if (this.templateId) {
      payload.template_id = this.templateId;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          authkey: this.authKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.error(
          { phoneNumber: maskedPhone, status: response.status, errorText: errText },
          'Failed to send SMS via MSG91 API',
        );
        throw new Error(`MSG91 SMS delivery failed with status ${response.status}`);
      }

      logger.info(
        { phoneNumber: maskedPhone, provider: 'msg91' },
        'OTP SMS sent successfully via MSG91',
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('MSG91 SMS delivery failed')) {
        throw err;
      }
      logger.error({ phoneNumber: maskedPhone, err }, 'Network failure during MSG91 SMS dispatch');
      throw new Error('SMS delivery failed due to network error');
    }
  }
}

/**
 * Production Fast2SMS provider integration.
 */
export class Fast2SmsProvider implements OtpDeliveryProvider {
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || env.FAST2SMS_API_KEY || '';
  }

  async sendOtp(phoneNumber: string, otp: string): Promise<void> {
    const maskedPhone = maskPhoneNumber(phoneNumber);

    if (!this.apiKey) {
      logger.warn(
        { phoneNumber: maskedPhone },
        'Fast2SMS API key missing in environment variables. Falling back to development log.',
      );
      const devProvider = new DevelopmentOtpDeliveryProvider();
      await devProvider.sendOtp(phoneNumber, otp);
      return;
    }

    const url = 'https://www.fast2sms.com/dev/bulkV2';
    // Fast2SMS expects 10-digit number for India
    const number10Digit = phoneNumber.replace(/\D/g, '').slice(-10);

    const payload = {
      variables_values: otp,
      route: 'otp',
      numbers: number10Digit,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          authorization: this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.error(
          { phoneNumber: maskedPhone, status: response.status, errorText: errText },
          'Failed to send SMS via Fast2SMS API',
        );
        throw new Error(`Fast2SMS delivery failed with status ${response.status}`);
      }

      logger.info(
        { phoneNumber: maskedPhone, provider: 'fast2sms' },
        'OTP SMS sent successfully via Fast2SMS',
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('Fast2SMS delivery failed')) {
        throw err;
      }
      logger.error({ phoneNumber: maskedPhone, err }, 'Network failure during Fast2SMS dispatch');
      throw new Error('SMS delivery failed due to network error');
    }
  }
}

export function createOtpDeliveryProvider(): OtpDeliveryProvider {
  if (env.NODE_ENV === 'test') {
    return new MockOtpDeliveryProvider();
  }

  const configuredProvider = env.SMS_PROVIDER;

  switch (configuredProvider) {
    case 'twilio':
      return new TwilioSmsProvider();
    case 'msg91':
      return new Msg91SmsProvider();
    case 'fast2sms':
      return new Fast2SmsProvider();
    case 'mock':
      return new MockOtpDeliveryProvider();
    case 'dev':
    case 'development':
    default:
      return new DevelopmentOtpDeliveryProvider();
  }
}

export const otpDeliveryProvider: OtpDeliveryProvider = createOtpDeliveryProvider();
