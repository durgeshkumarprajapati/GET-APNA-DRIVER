import 'server-only';
import { env } from '@/shared/config/env';
import { logger } from '@/shared/logging/logger';

export interface WhatsAppSendMessageInput {
  toPhone: string;
  templateName?: string;
  parameters?: Record<string, string>;
  textMessage?: string;
}

export interface WhatsAppSendResult {
  messageId?: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  error?: string;
}

export interface WhatsAppProvider {
  sendMessage(input: WhatsAppSendMessageInput): Promise<WhatsAppSendResult>;
}

export function maskPhoneNumber(phoneNumber: string): string {
  if (phoneNumber.length <= 6) return '***';
  return phoneNumber.slice(0, 4) + '****' + phoneNumber.slice(-2);
}

/**
 * Development WhatsApp provider — logs message details to terminal stdout without external network requests.
 */
export class DevelopmentWhatsAppProvider implements WhatsAppProvider {
  async sendMessage(input: WhatsAppSendMessageInput): Promise<WhatsAppSendResult> {
    const maskedPhone = maskPhoneNumber(input.toPhone);
    const bodyText = input.textMessage || `Template: ${input.templateName}`;

    logger.info(
      { toPhone: maskedPhone, templateName: input.templateName },
      '[DEV ONLY] WhatsApp message dispatched',
    );

    console.log(
      `\n=========================================\n[DEV WHATSAPP NOTIFICATION]\nTo: ${input.toPhone}\nMessage: ${bodyText}\n=========================================\n`,
    );

    return {
      messageId: `dev-wa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      status: 'delivered',
    };
  }
}

/**
 * Mock WhatsApp provider — used in unit test suites for deterministic assertions.
 */
export class MockWhatsAppProvider implements WhatsAppProvider {
  public readonly sentMessages: WhatsAppSendMessageInput[] = [];

  async sendMessage(input: WhatsAppSendMessageInput): Promise<WhatsAppSendResult> {
    this.sentMessages.push(input);
    return {
      messageId: `mock-wa-${this.sentMessages.length}`,
      status: 'delivered',
    };
  }

  getLastMessage(toPhone?: string): WhatsAppSendMessageInput | undefined {
    if (!toPhone) return this.sentMessages[this.sentMessages.length - 1];
    return [...this.sentMessages].reverse().find((msg) => msg.toPhone === toPhone);
  }

  clear(): void {
    this.sentMessages.length = 0;
  }
}

/**
 * Meta WhatsApp Business Cloud API provider integration.
 */
export class MetaWhatsAppProvider implements WhatsAppProvider {
  private readonly apiToken: string;
  private readonly phoneNumberId: string;

  constructor(apiToken?: string, phoneNumberId?: string) {
    this.apiToken = apiToken || env.WHATSAPP_API_TOKEN || '';
    this.phoneNumberId = phoneNumberId || env.WHATSAPP_PHONE_NUMBER_ID || '';
  }

  async sendMessage(input: WhatsAppSendMessageInput): Promise<WhatsAppSendResult> {
    const maskedPhone = maskPhoneNumber(input.toPhone);

    if (!this.apiToken || !this.phoneNumberId) {
      logger.warn(
        { toPhone: maskedPhone },
        'Meta WhatsApp API credentials missing in environment variables. Falling back to development provider.',
      );
      const devProvider = new DevelopmentWhatsAppProvider();
      return await devProvider.sendMessage(input);
    }

    const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
    const cleanNumber = input.toPhone.replace(/\D/g, '');

    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      to: cleanNumber,
    };

    if (input.templateName) {
      payload.type = 'template';
      payload.template = {
        name: input.templateName,
        language: { code: 'en' },
        components: input.parameters
          ? [
              {
                type: 'body',
                parameters: Object.entries(input.parameters).map(([_, value]) => ({
                  type: 'text',
                  text: value,
                })),
              },
            ]
          : [],
      };
    } else {
      payload.type = 'text';
      payload.text = { body: input.textMessage || '' };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          { toPhone: maskedPhone, status: response.status, errorText },
          'Meta WhatsApp Cloud API dispatch failed',
        );
        return {
          status: 'failed',
          error: `Meta WhatsApp API error ${response.status}`,
        };
      }

      const resData = (await response.json()) as { messages?: Array<{ id: string }> };
      const messageId = resData.messages?.[0]?.id || `meta-wa-${Date.now()}`;

      logger.info(
        { toPhone: maskedPhone, messageId },
        'WhatsApp message sent successfully via Meta Cloud API',
      );

      return {
        messageId,
        status: 'sent',
      };
    } catch (err: unknown) {
      logger.error({ toPhone: maskedPhone, err }, 'Network error during WhatsApp API dispatch');
      return {
        status: 'failed',
        error: err instanceof Error ? err.message : 'Network error',
      };
    }
  }
}

export function createWhatsAppProvider(): WhatsAppProvider {
  if (env.NODE_ENV === 'test') {
    return new MockWhatsAppProvider();
  }

  const providerName = env.WHATSAPP_PROVIDER;

  switch (providerName) {
    case 'meta':
      return new MetaWhatsAppProvider();
    case 'mock':
      return new MockWhatsAppProvider();
    case 'dev':
    case 'development':
    default:
      return new DevelopmentWhatsAppProvider();
  }
}

export const whatsAppProvider: WhatsAppProvider = createWhatsAppProvider();
