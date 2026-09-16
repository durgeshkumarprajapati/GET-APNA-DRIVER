/**
 * Phase 51 — Trust, Fraud & Risk Intelligence Engine Domain Types
 */

export type RiskSubjectType =
  | 'CUSTOMER'
  | 'DRIVER'
  | 'BOOKING'
  | 'PAYMENT'
  | 'REFERRAL'
  | 'PROMOTION'
  | 'ACCOUNT'
  | 'CORPORATE_ACCOUNT';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RiskConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type RiskDecisionStatus =
  | 'DETECTED'
  | 'REVIEW_REQUIRED'
  | 'ACKNOWLEDGED'
  | 'ACTION_PENDING'
  | 'ACTION_IN_PROGRESS'
  | 'RESOLVED'
  | 'DISMISSED'
  | 'ESCALATED';

export interface RiskSignal {
  signalId: string;
  category: string;
  subjectType: RiskSubjectType;
  subjectId: string;
  name: string;
  description: string;
  weight: number; // 0 to 100
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface RiskEvidence {
  what: string;
  why: string;
  evidenceItems: string[];
  confidence: RiskConfidence;
  recommendedAction: string;
}

export interface RiskRuleResult {
  ruleId: string;
  ruleName: string;
  subjectType: RiskSubjectType;
  triggered: boolean;
  scoreContribution: number;
  evidence: string[];
  confidence: RiskConfidence;
  suggestedAction?: string;
}

export interface RiskDecision {
  riskId: string;
  subjectType: RiskSubjectType;
  subjectId: string;
  subjectName?: string;
  riskType: string;
  riskScore: number; // 0 to 100
  riskLevel: RiskLevel;
  confidence: RiskConfidence;
  status: RiskDecisionStatus;
  fingerprint: string;
  signals: RiskSignal[];
  evidence: RiskEvidence;
  recommendedActions: RiskActionRecommendation[];
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  dismissedBy?: string;
  dismissedAt?: string;
  escalatedBy?: string;
  escalatedAt?: string;
  resolvedAt?: string;
  updatedAt: string;
  createdAt: string;
}

export interface RiskActionRecommendation {
  actionId: string;
  title: string;
  description: string;
  actionType:
    | 'REQUEST_VERIFICATION'
    | 'FLAG_FOR_REVIEW'
    | 'WARN_SUBJECT'
    | 'REQUIRE_STEP_UP'
    | 'LIMIT_DISPATCH_OFFERS';
  isAutomatedAllowed: boolean;
  requiresOperatorApproval: boolean;
  executed?: boolean;
  executedBy?: string;
  executedAt?: string;
  resultSummary?: string;
}

export interface RiskOverviewSummary {
  totalActiveRisks: number;
  criticalRisksCount: number;
  highRisksCount: number;
  mediumRisksCount: number;
  lowRisksCount: number;
  reviewRequiredCount: number;
  subjectBreakdown: Record<RiskSubjectType, number>;
  latestDecisions: RiskDecision[];
  evaluatedAt: string;
}
