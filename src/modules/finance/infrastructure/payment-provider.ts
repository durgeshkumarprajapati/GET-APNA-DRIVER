import 'server-only';
import crypto from 'node:crypto';
import { env } from '@/shared/config/env';
import { logger } from '@/shared/logging/logger';

export interface CreateOrderInput {
  amountMinorUnits: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  providerOrderId: string;
  amountMinorUnits: number;
  currency: string;
  status: string;
}

export interface FetchPaymentResult {
  providerPaymentId: string;
  providerOrderId: string | null;
  status: string;
  amountMinorUnits: number;
  currency: string;
}

export interface VerifyPaymentSignatureInput {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}

export interface InitiateRefundInput {
  providerPaymentId: string;
  /** Omit for a full refund of the original captured amount. */
  amountMinorUnits?: number;
  notes?: Record<string, string>;
}

export interface InitiateRefundResult {
  providerRefundId: string;
  status: string;
  amountMinorUnits: number;
}

/**
 * Provider-independent contract for the payment gateway. All Razorpay SDK
 * calls / HTTP calls stay inside RazorpayPaymentProvider — application
 * services only ever depend on this interface (see payment-service.ts,
 * refund-service.ts, webhook-service.ts).
 */
export interface PaymentProvider {
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  fetchPayment(providerPaymentId: string): Promise<FetchPaymentResult>;
  /** Verifies the client-side checkout completion signature (order_id|payment_id HMAC). */
  verifyPaymentSignature(input: VerifyPaymentSignatureInput): boolean;
  initiateRefund(input: InitiateRefundInput): Promise<InitiateRefundResult>;
  /** Verifies an incoming webhook's signature against the exact raw request body. */
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}

const RAZORPAY_API_BASE_URL = 'https://api.razorpay.com/v1';

function getRazorpayCredentials(): { keyId: string; keySecret: string } {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured.');
  }
  return { keyId: env.RAZORPAY_KEY_ID, keySecret: env.RAZORPAY_KEY_SECRET };
}

function basicAuthHeader(keyId: string, keySecret: string): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

function timingSafeEqualHex(expectedHex: string, actualHex: string): boolean {
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = Buffer.from(actualHex, 'hex');
  if (expected.length !== actual.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, actual);
}

interface RazorpayErrorBody {
  error?: { description?: string; code?: string };
}

/**
 * Talks to Razorpay's REST API directly via `fetch` + HMAC — deliberately no
 * `razorpay` SDK dependency, matching this codebase's preference for Node
 * built-ins over new dependencies where they suffice (see
 * email-provider.ts / otp-provider.ts, which take the same approach for
 * their respective external services).
 */
export class RazorpayPaymentProvider implements PaymentProvider {
  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const { keyId, keySecret } = getRazorpayCredentials();

    const response = await fetch(`${RAZORPAY_API_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: basicAuthHeader(keyId, keySecret),
      },
      body: JSON.stringify({
        amount: input.amountMinorUnits,
        currency: input.currency,
        receipt: input.receipt,
        notes: input.notes ?? {},
      }),
    });

    const body = (await response.json()) as RazorpayErrorBody & {
      id?: string;
      amount?: number;
      currency?: string;
      status?: string;
    };

    if (!response.ok || !body.id) {
      throw new Error(
        `Razorpay order creation failed: ${body.error?.description ?? response.statusText}`,
      );
    }

    return {
      providerOrderId: body.id,
      amountMinorUnits: body.amount ?? input.amountMinorUnits,
      currency: body.currency ?? input.currency,
      status: body.status ?? 'created',
    };
  }

  async fetchPayment(providerPaymentId: string): Promise<FetchPaymentResult> {
    const { keyId, keySecret } = getRazorpayCredentials();

    const response = await fetch(`${RAZORPAY_API_BASE_URL}/payments/${providerPaymentId}`, {
      headers: { Authorization: basicAuthHeader(keyId, keySecret) },
    });

    const body = (await response.json()) as RazorpayErrorBody & {
      id?: string;
      order_id?: string;
      status?: string;
      amount?: number;
      currency?: string;
    };

    if (!response.ok || !body.id) {
      throw new Error(
        `Razorpay payment fetch failed: ${body.error?.description ?? response.statusText}`,
      );
    }

    return {
      providerPaymentId: body.id,
      providerOrderId: body.order_id ?? null,
      status: body.status ?? 'unknown',
      amountMinorUnits: body.amount ?? 0,
      currency: body.currency ?? 'INR',
    };
  }

  verifyPaymentSignature(input: VerifyPaymentSignatureInput): boolean {
    const { keySecret } = getRazorpayCredentials();
    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${input.providerOrderId}|${input.providerPaymentId}`)
      .digest('hex');
    return timingSafeEqualHex(expected, input.signature);
  }

  async initiateRefund(input: InitiateRefundInput): Promise<InitiateRefundResult> {
    const { keyId, keySecret } = getRazorpayCredentials();

    const response = await fetch(
      `${RAZORPAY_API_BASE_URL}/payments/${input.providerPaymentId}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: basicAuthHeader(keyId, keySecret),
        },
        body: JSON.stringify({
          ...(input.amountMinorUnits !== undefined ? { amount: input.amountMinorUnits } : {}),
          notes: input.notes ?? {},
        }),
      },
    );

    const body = (await response.json()) as RazorpayErrorBody & {
      id?: string;
      status?: string;
      amount?: number;
    };

    if (!response.ok || !body.id) {
      throw new Error(`Razorpay refund failed: ${body.error?.description ?? response.statusText}`);
    }

    return {
      providerRefundId: body.id,
      status: body.status ?? 'pending',
      amountMinorUnits: body.amount ?? input.amountMinorUnits ?? 0,
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET must be configured.');
    }
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    return timingSafeEqualHex(expected, signature);
  }
}

/**
 * Deterministic in-memory simulation for development and tests — no network
 * calls, no real Razorpay credentials required. Mirrors the role of
 * DevelopmentOtpDeliveryProvider / DevelopmentEmailDeliveryProvider for
 * their respective external services.
 */
export class MockPaymentProvider implements PaymentProvider {
  private static readonly MOCK_SECRET = 'mock-payment-provider-secret';

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const providerOrderId = `order_mock_${crypto.randomUUID()}`;
    logger.info({ providerOrderId, ...input }, '[DEV ONLY] Mock Razorpay order created');
    return {
      providerOrderId,
      amountMinorUnits: input.amountMinorUnits,
      currency: input.currency,
      status: 'created',
    };
  }

  async fetchPayment(providerPaymentId: string): Promise<FetchPaymentResult> {
    return {
      providerPaymentId,
      providerOrderId: null,
      status: 'captured',
      amountMinorUnits: 0,
      currency: 'INR',
    };
  }

  verifyPaymentSignature(input: VerifyPaymentSignatureInput): boolean {
    return (
      input.signature ===
      MockPaymentProvider.signMockCheckout(input.providerOrderId, input.providerPaymentId)
    );
  }

  async initiateRefund(input: InitiateRefundInput): Promise<InitiateRefundResult> {
    const providerRefundId = `rfnd_mock_${crypto.randomUUID()}`;
    logger.info({ providerRefundId, ...input }, '[DEV ONLY] Mock Razorpay refund created');
    return {
      providerRefundId,
      status: 'processed',
      amountMinorUnits: input.amountMinorUnits ?? 0,
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    return signature === MockPaymentProvider.signMockWebhook(rawBody);
  }

  /** Dev/test helper: computes the signature a real checkout completion would carry. */
  static signMockCheckout(providerOrderId: string, providerPaymentId: string): string {
    return crypto
      .createHmac('sha256', MockPaymentProvider.MOCK_SECRET)
      .update(`${providerOrderId}|${providerPaymentId}`)
      .digest('hex');
  }

  /** Dev/test helper: computes the signature a real Razorpay webhook delivery would carry. */
  static signMockWebhook(rawBody: string): string {
    return crypto
      .createHmac('sha256', MockPaymentProvider.MOCK_SECRET)
      .update(rawBody)
      .digest('hex');
  }
}

export const paymentProvider: PaymentProvider =
  env.NODE_ENV === 'production' ? new RazorpayPaymentProvider() : new MockPaymentProvider();
