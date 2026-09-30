// Phase 85 made these Prisma-backed enums (operations_decisions is now a
// durable table, not an in-memory Map) — aliased under their original
// names so every existing consumer of this module keeps working unchanged.
import type {
  OperationsDecisionType as PrismaOperationsDecisionType,
  OperationsSeverity as PrismaOperationsSeverity,
  OperationsConfidence as PrismaOperationsConfidence,
  OperationsDecisionStatus as PrismaOperationsDecisionStatus,
  OperationsExecutionStatus as PrismaOperationsExecutionStatus,
} from '@prisma/client';

export type OperationsDecisionType = PrismaOperationsDecisionType;
export type OperationsSeverity = PrismaOperationsSeverity;
export type OperationsConfidence = PrismaOperationsConfidence;
export type OperationsDecisionStatus = PrismaOperationsDecisionStatus;
export type OperationsExecutionStatus = PrismaOperationsExecutionStatus;

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

export interface OperationsDecisionExecution {
  id: string;
  decisionId: string;
  actionId: string;
  actionType: string;
  status: OperationsExecutionStatus;
  attemptNumber: number;
  idempotencyKey: string;
  actorUserId: string;
  reason?: string | null;
  resultMessage?: string | null;
  failureCode?: string | null;
  failureSummary?: string | null;
  details?: Record<string, unknown> | null;
  startedAt: Date;
  completedAt?: Date | null;
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
  zoneId?: string | null;
  bookingId?: string | null;
  incidentId?: string | null;
  evidence: OperationsEvidenceItem[];
  recommendedActions: OperationsActionDefinition[];
  expectedImpact: string;
  createdAt: Date;
  evaluatedAt: Date;
  acknowledgedBy?: string | null;
  acknowledgedAt?: Date | null;
  resolvedAt?: Date | null;
  dismissedBy?: string | null;
  dismissedAt?: Date | null;
  dismissalReason?: string | null;
  escalatedAt?: Date | null;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  /** Only populated by the single-decision detail lookup, not the list endpoint. */
  executions?: OperationsDecisionExecution[];
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
