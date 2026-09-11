import crypto from 'crypto';
import { CallStatus } from '@prisma/client';
import { TelephonyProvider } from './telephony-provider';
import { TelephonyInitiateCallParams, TelephonyCallResult, TelephonyWebhookPayload } from '../domain/types';

export class ExotelTelephonyProvider implements TelephonyProvider {
  readonly name = 'EXOTEL';

  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly webhookSecret: string;

  constructor() {
    this.accountSid = process.env.TELEPHONY_ACCOUNT_SID || '';
    this.authToken = process.env.TELEPHONY_AUTH_TOKEN || '';
    this.webhookSecret = process.env.TELEPHONY_WEBHOOK_SECRET || '';
  }

  async initiateCall(params: TelephonyInitiateCallParams): Promise<TelephonyCallResult> {
    if (!this.accountSid || !this.authToken) {
      const providerCallId = `exotel_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        providerCallId,
        status: CallStatus.INITIATED,
        startedAt: new Date(),
        rawResponse: { note: 'Credentials missing; simulated Exotel initiation' },
      };
    }

    try {
      const endpoint = `https://api.exotel.com/v1/Accounts/${this.accountSid}/Calls/connect.json`;
      const authHeader = `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`;

      const formData = new URLSearchParams({
        From: params.callerPhone,
        To: params.recipientPhone,
        CallerId: params.proxyNumber,
        CustomField: params.sessionId,
      });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const responseJson = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        const restEx = responseJson?.RestException as Record<string, unknown> | undefined;
        throw new Error(String(restEx?.Message || `Exotel API HTTP ${res.status}`));
      }

      const callObj = responseJson?.Call as Record<string, unknown> | undefined;
      const providerCallId = String(callObj?.Sid || `exotel_${Date.now()}`);
      return {
        providerCallId,
        status: CallStatus.INITIATED,
        startedAt: new Date(),
        rawResponse: responseJson,
      };
    } catch (err: unknown) {
      const providerCallId = `exotel_err_${Date.now()}`;
      const msg = err instanceof Error ? err.message : String(err);
      return {
        providerCallId,
        status: CallStatus.FAILED,
        rawResponse: { error: msg },
      };
    }
  }

  verifyWebhookSignature(headers: Record<string, string | string[] | undefined>, rawBody: string): boolean {
    if (!this.webhookSecret) {
      return true;
    }

    const signatureHeader =
      headers['x-exotel-signature'] ||
      headers['x-telephony-signature'] ||
      headers['x-signature'];

    if (!signatureHeader) {
      return false;
    }

    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

    const computedHmacSha256 = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    const computedHmacSha1 = crypto
      .createHmac('sha1', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    return (
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedHmacSha256)) ||
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedHmacSha1)) ||
      signature === this.webhookSecret
    );
  }

  parseWebhookPayload(body: Record<string, unknown> | string): TelephonyWebhookPayload {
    const payload = typeof body === 'string' ? JSON.parse(body) : body;

    const providerCallId = String(
      payload.CallSid || payload.Sid || payload.providerCallId || 'exotel_unknown',
    );
    const rawStatus = String(payload.Status || payload.status || 'completed').toLowerCase();

    let status: CallStatus;
    let failureReason: string | undefined = payload.DetailedStatus ? String(payload.DetailedStatus) : undefined;

    switch (rawStatus) {
      case 'initiated':
      case 'queued':
        status = CallStatus.INITIATED;
        break;
      case 'ringing':
        status = CallStatus.RINGING;
        break;
      case 'in-progress':
      case 'answered':
        status = CallStatus.ANSWERED;
        break;
      case 'completed':
        status = CallStatus.COMPLETED;
        break;
      case 'busy':
        status = CallStatus.FAILED;
        if (!failureReason) failureReason = 'BUSY';
        break;
      case 'no-answer':
        status = CallStatus.FAILED;
        if (!failureReason) failureReason = 'NO_ANSWER';
        break;
      case 'failed':
        status = CallStatus.FAILED;
        break;
      case 'canceled':
      case 'cancelled':
        status = CallStatus.CANCELLED;
        break;
      default:
        status = CallStatus.COMPLETED;
    }

    return {
      providerCallId,
      event: String(payload.EventType || payload.event || `call.${rawStatus}`),
      status,
      durationSeconds: payload.CallDuration ? parseInt(String(payload.CallDuration), 10) : undefined,
      failureReason,
      timestamp: payload.StartTime ? new Date(String(payload.StartTime)) : new Date(),
      rawPayload: payload,
    };
  }
}
