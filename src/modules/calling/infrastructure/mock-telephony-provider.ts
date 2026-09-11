import { CallStatus } from '@prisma/client';
import { TelephonyProvider } from './telephony-provider';
import { TelephonyInitiateCallParams, TelephonyCallResult, TelephonyWebhookPayload } from '../domain/types';

export class MockTelephonyProvider implements TelephonyProvider {
  readonly name = 'MOCK';

  async initiateCall(params: TelephonyInitiateCallParams): Promise<TelephonyCallResult> {
    const providerCallId = `mock_call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      providerCallId,
      status: CallStatus.INITIATED,
      startedAt: new Date(),
      rawResponse: {
        mock: true,
        sessionId: params.sessionId,
        callerPhone: params.callerPhone,
        recipientPhone: params.recipientPhone,
        callType: params.callType,
      },
    };
  }

  verifyWebhookSignature(headers: Record<string, string | string[] | undefined>, _rawBody: string): boolean {
    const signatureHeader = headers['x-mock-signature'] || headers['x-telephony-signature'];
    const secret = process.env.TELEPHONY_WEBHOOK_SECRET || 'mock-secret';

    if (signatureHeader) {
      if (Array.isArray(signatureHeader)) return signatureHeader[0] === secret || signatureHeader[0] === 'valid_mock_signature';
      return signatureHeader === secret || signatureHeader === 'valid_mock_signature';
    }
    return true;
  }

  parseWebhookPayload(body: Record<string, unknown> | string): TelephonyWebhookPayload {
    const payload = typeof body === 'string' ? JSON.parse(body) : body;
    const providerCallId = String(payload.providerCallId || payload.CallSid || payload.Sid || 'mock_unknown');
    const statusStr = String(payload.status || payload.CallStatus || 'COMPLETED').toUpperCase();

    let status: CallStatus;
    let failureReason: string | undefined = payload.failureReason ? String(payload.failureReason) : undefined;

    switch (statusStr) {
      case 'RINGING':
      case 'IN-PROGRESS':
      case 'IN_PROGRESS':
        status = CallStatus.RINGING;
        break;
      case 'ANSWERED':
      case 'IN-PROGRESS-ANSWERED':
        status = CallStatus.ANSWERED;
        break;
      case 'COMPLETED':
        status = CallStatus.COMPLETED;
        break;
      case 'BUSY':
        status = CallStatus.FAILED;
        if (!failureReason) failureReason = 'BUSY';
        break;
      case 'NO-ANSWER':
      case 'NO_ANSWER':
        status = CallStatus.FAILED;
        if (!failureReason) failureReason = 'NO_ANSWER';
        break;
      case 'FAILED':
        status = CallStatus.FAILED;
        break;
      case 'CANCELED':
      case 'CANCELLED':
        status = CallStatus.CANCELLED;
        break;
      default:
        status = CallStatus.COMPLETED;
    }

    return {
      providerCallId,
      event: String(payload.event || `call.${status.toLowerCase()}`),
      status,
      durationSeconds: typeof payload.durationSeconds === 'number' ? payload.durationSeconds : (payload.CallDuration ? parseInt(String(payload.CallDuration), 10) : undefined),
      failureReason,
      timestamp: payload.timestamp ? new Date(String(payload.timestamp)) : new Date(),
      rawPayload: payload,
    };
  }
}
