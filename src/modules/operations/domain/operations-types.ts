export type OperationsDecisionType =
  | 'DISPATCH_PRESSURE'
  | 'DRIVER_SHORTAGE'
  | 'BOOKING_BACKLOG'
  | 'TRIP_RELIABILITY_PRESSURE'
  | 'SAFETY_PRESSURE'
  | 'SUPPORT_BACKLOG'
  | 'SCHEDULED_RIDE_RISK'
  | 'PLATFORM_DEGRADATION'
  | 'DEPENDENCY_DEGRADATION'
  | 'LOCATION_TELEMETRY_DEGRADATION';

export type OperationsSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type OperationsConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type OperationsDecisionStatus =
  | 'DETECTED'
  | 'ACKNOWLEDGED'
  | 'ACTION_PENDING'
  | 'ACTION_IN_PROGRESS'
  | 'RESOLVED'
  | 'DISMISSED'
  | 'ESCALATED';

export type OperationsActionCategory =
  'OBSERVE_ONLY' | 'MANUAL_CONFIRMATION' | 'AUTOMATED_LOW_RISK';

export type OperationsActionType =
  | 'VIEW_BOOKINGS'
  | 'VIEW_DRIVERS'
  | 'VIEW_INCIDENT'
  | 'VIEW_ZONE'
  | 'VIEW_PLATFORM_HEALTH'
  | 'RESTART_DISPATCH'
  | 'REASSIGN_DRIVER'
  | 'FORCE_ASSIGN'
  | 'CANCEL_BOOKING'
  | 'ESCALATE_INCIDENT'
  | 'RESOLVE_INCIDENT'
  | 'CONTACT_SUPPORT'
  | 'VIEW_SCHEDULED_RIDE'
  | 'VIEW_SUPPORT_BACKLOG';

export interface OperationsEvidenceItem {
  key: string;
  label: string;
  value: string | number;
  expected?: string | number;
}

export interface OperationsActionDefinition {
  id: string;
  type: OperationsActionType;
  label: string;
  category: OperationsActionCategory;
  href?: string;
  params?: Record<string, unknown>;
  requiresConfirmation: boolean;
  impactSummary: string;
}

export interface OperationsDecision {
  id: string;
  fingerprint: string;
  decisionType: OperationsDecisionType;
  severity: OperationsSeverity;
  confidence: OperationsConfidence;
  status: OperationsDecisionStatus;
  title: string;
  summary: string;
  why: string;
  zoneId?: string;
  bookingId?: string;
  incidentId?: string;
  evidence: OperationsEvidenceItem[];
  recommendedActions: OperationsActionDefinition[];
  expectedImpact: string;
  createdAt: Date;
  evaluatedAt: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  dismissedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface OperationsCommandSummary {
  activeDecisionsCount: number;
  criticalCount: number;
  highCount: number;
  searchingBookingsCount: number;
  availableDriversCount: number;
  activeTripsCount: number;
  activeSafetyIncidentsCount: number;
  openSupportTicketsCount: number;
  platformHealthScore: number;
  systemStatus: 'HEALTHY' | 'DEGRADED' | 'OUTAGE';
  decisions: OperationsDecision[];
  updatedSecondsAgo: number;
}
