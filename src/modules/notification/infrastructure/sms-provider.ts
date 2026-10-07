import 'server-only';
import { logger } from '@/shared/logging/logger';
import { whatsAppProvider } from './whatsapp-provider';

export interface SendSmsInput {
  to: string;
  message: string;
}

export interface SendSmsResult {
  messageId: string;
  status: 'sent' | 'delivered' | 'failed';
}

export async function sendSmsNotification(input: SendSmsInput): Promise<SendSmsResult> {
  logger.info({ to: input.to }, '[SMS Fallback] Dispatching SMS notification');

  // Dispatched via the WhatsApp provider — its real result (not just
  // thrown errors) must propagate, or a caller relying on this result to
  // decide whether delivery actually succeeded (e.g. the delivery-retry
  // service) will record a failed send as delivered.
  try {
    const result = await whatsAppProvider.sendMessage({
      toPhone: input.to,
      textMessage: input.message,
    });
    return {
      messageId: `sms-${crypto.randomUUID()}`,
      status: result.status === 'failed' ? 'failed' : 'delivered',
    };
  } catch (err) {
    logger.error({ err, to: input.to }, '[SMS Fallback] WhatsApp dispatch threw');
    return {
      messageId: `sms-${crypto.randomUUID()}`,
      status: 'failed',
    };
  }
}
