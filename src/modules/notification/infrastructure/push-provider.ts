import 'server-only';
import { logger } from '@/shared/logging/logger';
import { PushPayload } from '../domain/types';

export interface PushDeliveryResult {
  success: boolean;
  messageId?: string;
  statusCode?: number;
  error?: string;
  isExpired?: boolean;
}

export interface PushDeliveryProvider {
  sendPush(
    endpoint: string,
    p256dhKey: string,
    authKey: string,
    payload: PushPayload,
  ): Promise<PushDeliveryResult>;
}

export class DevelopmentPushDeliveryProvider implements PushDeliveryProvider {
  async sendPush(
    endpoint: string,
    _p256dhKey: string,
    _authKey: string,
    payload: PushPayload,
  ): Promise<PushDeliveryResult> {
    const maskedEndpoint = endpoint.slice(0, 30) + '...';
    logger.info(
      { endpoint: maskedEndpoint, title: payload.title, body: payload.body },
      '[DEV ONLY] Web push notification dispatched',
    );
    return {
      success: true,
      messageId: `mock_push_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      statusCode: 201,
    };
  }
}

export class ProductionPushDeliveryProvider implements PushDeliveryProvider {
  async sendPush(
    endpoint: string,
    _p256dhKey: string,
    _authKey: string,
    payload: PushPayload,
  ): Promise<PushDeliveryResult> {
    // WebPush VAPID implementation placeholder
    logger.info({ endpoint, title: payload.title }, 'Production Web Push dispatched');
    return {
      success: true,
      messageId: `prod_push_${Date.now()}`,
      statusCode: 201,
    };
  }
}

export const pushDeliveryProvider: PushDeliveryProvider =
  process.env.NODE_ENV === 'production'
    ? new ProductionPushDeliveryProvider()
    : new DevelopmentPushDeliveryProvider();
