import 'server-only';
import webpush from 'web-push';
import { env } from '@/shared/config/env';
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

export class VapidPushDeliveryProvider implements PushDeliveryProvider {
  private isConfigured = false;

  constructor() {
    const publicKey = process.env.VAPID_PUBLIC_KEY || env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY || env.VAPID_PRIVATE_KEY;
    const subject =
      process.env.VAPID_SUBJECT || env.VAPID_SUBJECT || 'mailto:support@getapnadriver.local';

    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.isConfigured = true;
      } catch (err) {
        logger.error({ error: err }, 'Failed to configure VAPID web-push details');
      }
    }
  }

  async sendPush(
    endpoint: string,
    p256dhKey: string,
    authKey: string,
    payload: PushPayload,
  ): Promise<PushDeliveryResult> {
    if (!this.isConfigured) {
      const devProvider = new DevelopmentPushDeliveryProvider();
      return devProvider.sendPush(endpoint, p256dhKey, authKey, payload);
    }

    const pushSubscription = {
      endpoint,
      keys: {
        p256dh: p256dhKey,
        auth: authKey,
      },
    };

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon ?? '/icon-192.png',
      badge: payload.badge ?? '/badge-72.png',
      data: payload.data ?? {},
    });

    try {
      const response = await webpush.sendNotification(pushSubscription, notificationPayload);
      return {
        success: true,
        messageId: `vapid_push_${Date.now()}`,
        statusCode: response.statusCode,
      };
    } catch (err: unknown) {
      const pushErr = err as { statusCode?: number; status?: number; message?: string };
      const statusCode = pushErr.statusCode || pushErr.status;
      const isExpired = statusCode === 404 || statusCode === 410;
      logger.error(
        { endpoint: endpoint.slice(0, 30) + '...', statusCode, isExpired, error: pushErr.message },
        'Web Push delivery failed',
      );
      return {
        success: false,
        statusCode,
        error: pushErr.message || 'Web Push delivery failed',
        isExpired,
      };
    }
  }
}

export const pushDeliveryProvider: PushDeliveryProvider =
  process.env.NODE_ENV === 'test'
    ? new DevelopmentPushDeliveryProvider()
    : new VapidPushDeliveryProvider();
