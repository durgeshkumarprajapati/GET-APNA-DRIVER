import {
  SafetyIncidentType,
  SafetyIncidentSeverity,
  SafetyIncidentStatus,
  SafetyIncident,
  SafetyIncidentTimeline,
} from '@prisma/client';

export interface TriggerSosInput {
  reporterUserId: string;
  bookingId?: string;
  type?: SafetyIncidentType;
  severity?: SafetyIncidentSeverity;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  snapshotAddress?: string;
  description?: string;
  idempotencyKey?: string;
}

export interface UpdateSafetyIncidentStatusInput {
  incidentId: string;
  actionUserId: string;
  toStatus: SafetyIncidentStatus;
  notes?: string;
  assignedOperatorId?: string;
  resolutionSummary?: string;
}

export interface AssignSafetyOperatorInput {
  incidentId: string;
  assignedOperatorId: string;
  assignedByUserId: string;
  notes?: string;
}

export interface SafetyIncidentWithDetails extends SafetyIncident {
  timelineEntries: SafetyIncidentTimeline[];
  booking?: {
    id: string;
    status: string;
    pickupAddress: string;
    customerId: string;
    driverProfileId: string | null;
  } | null;
  reporterUser?: {
    id: string;
    identities: Array<{ providerSubject: string }>;
  } | null;
  assignedOperator?: {
    id: string;
    identities: Array<{ providerSubject: string }>;
  } | null;
}
