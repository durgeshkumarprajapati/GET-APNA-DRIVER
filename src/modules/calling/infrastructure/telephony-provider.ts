import { TelephonyInitiateCallParams, TelephonyCallResult, TelephonyWebhookPayload } from '../domain/types';
import { MockTelephonyProvider } from './mock-telephony-provider';
import { ExotelTelephonyProvider } from './exotel-telephony-provider';
import { env } from '@/shared/config/env';

export interface TelephonyProvider {
  readonly name: string;

  /**
   * Initiates a telephony call session via the underlying provider API (e.g. Exotel proxy call or Mock call).
   */
  initiateCall(params: TelephonyInitiateCallParams): Promise<TelephonyCallResult>;

  /**
   * Verifies the cryptographic signature of incoming webhook requests from the telephony provider.
   */
  verifyWebhookSignature(headers: Record<string, string | string[] | undefined>, rawBody: string): boolean;

  /**
   * Parses the raw request body / payload from the provider into a normalized TelephonyWebhookPayload.
   */
  parseWebhookPayload(body: Record<string, unknown> | string): TelephonyWebhookPayload;
}

let providerInstance: TelephonyProvider | null = null;

export function getTelephonyProvider(): TelephonyProvider {
  if (providerInstance) {
    return providerInstance;
  }

  const providerType = env.TELEPHONY_PROVIDER || 'mock';

  if (providerType === 'exotel') {
    providerInstance = new ExotelTelephonyProvider();
  } else {
    providerInstance = new MockTelephonyProvider();
  }

  return providerInstance;
}

export function setTelephonyProviderForTesting(provider: TelephonyProvider | null): void {
  providerInstance = provider;
}
