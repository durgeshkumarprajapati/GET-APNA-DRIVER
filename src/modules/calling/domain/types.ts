import { CallType, CallStatus } from '@prisma/client';

export interface CallSessionDTO {
  id: string;
  provider: string;
  providerCallId: string | null;
  callType: CallType;
  status: CallStatus;
  initiatedByUserId: string;
  customerId: string;
  driverProfileId: string | null;
  bookingId: string | null;
  supportTicketId: string | null;
  callerPhoneMasked: string | null;
  recipientPhoneMasked: string | null;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InitiateCallRequest {
  bookingId?: string;
  supportTicketId?: string;
  reason?: string;
}

export interface DirectCallResponse {
  callSessionId: string;
  status: CallStatus;
  provider: string;
  providerCallId: string | null;
  callerPhoneMasked: string | null;
  recipientPhoneMasked: string | null;
  dialNumber?: string; // Support dial number or proxy bridge number if client direct calling
  instructions: string;
}

export interface TelephonyInitiateCallParams {
  sessionId: string;
  callerPhone: string;
  recipientPhone: string;
  proxyNumber: string;
  callType: CallType;
}

export interface TelephonyCallResult {
  providerCallId: string;
  status: CallStatus;
  startedAt?: Date;
  rawResponse?: Record<string, unknown>;
}

export interface TelephonyWebhookPayload {
  providerCallId: string;
  event: string; // e.g. 'call.initiated', 'call.ringing', 'call.answered', 'call.completed', 'call.failed'
  status: CallStatus;
  durationSeconds?: number;
  failureReason?: string;
  timestamp?: Date;
  rawPayload: Record<string, unknown>;
}
