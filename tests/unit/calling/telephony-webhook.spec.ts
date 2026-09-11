import { MockTelephonyProvider } from '@/modules/calling/infrastructure/mock-telephony-provider';
import { ExotelTelephonyProvider } from '@/modules/calling/infrastructure/exotel-telephony-provider';
import { CallStatus, CallType } from '@prisma/client';

describe('Telephony Provider & Webhook Unit Tests', () => {
  describe('MockTelephonyProvider', () => {
    const provider = new MockTelephonyProvider();

    it('initiates call and generates mock provider call id', async () => {
      const result = await provider.initiateCall({
        sessionId: 'session-123',
        callerPhone: '+919876543210',
        recipientPhone: '+919876543211',
        proxyNumber: '+911800000000',
        callType: CallType.CUSTOMER_TO_DRIVER,
      });

      expect(result.providerCallId).toContain('mock_call_');
      expect(result.status).toBe(CallStatus.INITIATED);
    });

    it('parses webhook payload into normalized status', () => {
      const payload = provider.parseWebhookPayload({
        providerCallId: 'mock_call_123',
        status: 'ANSWERED',
        durationSeconds: 45,
      });

      expect(payload.providerCallId).toBe('mock_call_123');
      expect(payload.status).toBe(CallStatus.ANSWERED);
      expect(payload.durationSeconds).toBe(45);
    });
  });

  describe('ExotelTelephonyProvider', () => {
    const provider = new ExotelTelephonyProvider();

    it('parses Exotel webhook body correctly', () => {
      const parsed = provider.parseWebhookPayload({
        CallSid: 'exotel_call_999',
        Status: 'completed',
        CallDuration: '120',
      });

      expect(parsed.providerCallId).toBe('exotel_call_999');
      expect(parsed.status).toBe(CallStatus.COMPLETED);
      expect(parsed.durationSeconds).toBe(120);
    });
  });
});
