import { DisputeCategory, DisputeStatus, Dispute, DisputeLog } from '@prisma/client';

export interface CreateDisputeInput {
  bookingId: string;
  raisedByUserId: string;
  category: DisputeCategory;
  reason: string;
  evidenceUrls?: string[];
}

export interface UpdateDisputeStatusInput {
  disputeId: string;
  actionUserId: string;
  toStatus: DisputeStatus;
  notes?: string;
  assignedOperatorId?: string;
}

export interface ResolveDisputeInput {
  disputeId: string;
  actionUserId: string;
  resolutionSummary: string;
  refundAmountMinorUnits?: number;
  financialAdjustmentSummary?: string;
  notes?: string;
}

export interface DisputeWithDetails extends Dispute {
  logs: DisputeLog[];
  booking?: {
    id: string;
    status: string;
    pickupAddress: string;
    customerId: string;
    driverProfileId: string | null;
  } | null;
}
