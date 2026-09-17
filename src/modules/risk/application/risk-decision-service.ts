import {
  RiskDecision,
  RiskDecisionStatus,
  RiskOverviewSummary,
  RiskSubjectType,
} from '../domain/risk-types';
import { RiskEvaluationRequest, RiskEvaluationService } from './risk-evaluation-service';
import { prisma } from '@/shared/database/prisma';

// In-memory persistent cache for active risk decisions during process lifetime
const decisionStore = new Map<string, RiskDecision>();
const fingerprintStore = new Map<string, string>(); // fingerprint -> riskId

export class RiskDecisionService {
  /**
   * Evaluate risk and record decision with fingerprint deduplication.
   */
  static async evaluateAndStore(req: RiskEvaluationRequest): Promise<RiskDecision> {
    const evaluation = RiskEvaluationService.evaluateRisk(req);

    // Deduplication check: if a risk decision with the same fingerprint exists, update or return it
    const existingRiskId = fingerprintStore.get(evaluation.fingerprint);
    if (existingRiskId && decisionStore.has(existingRiskId)) {
      const existing = decisionStore.get(existingRiskId)!;
      // Update score and timestamp if score increased
      if (evaluation.riskScore > existing.riskScore) {
        existing.riskScore = evaluation.riskScore;
        existing.riskLevel = evaluation.riskLevel;
        existing.confidence = evaluation.confidence;
        existing.evidence = evaluation.evidence;
        existing.updatedAt = new Date().toISOString();
      }
      return existing;
    }

    decisionStore.set(evaluation.riskId, evaluation);
    fingerprintStore.set(evaluation.fingerprint, evaluation.riskId);

    // Record audit entry for risk decision
    try {
      if (prisma.auditLog?.create) {
        await prisma.auditLog
          .create({
            data: {
              action: 'RISK_DECISION_CREATED',
              entityType: 'RiskDecision',
              entityId: evaluation.riskId,
              afterState: {
                subjectType: evaluation.subjectType,
                subjectId: evaluation.subjectId,
                riskScore: evaluation.riskScore,
                riskLevel: evaluation.riskLevel,
                confidence: evaluation.confidence,
                fingerprint: evaluation.fingerprint,
              },
            },
          })
          .catch(() => {
            // Safe failover if audit schema field naming differs
          });
      }
    } catch {
      // Non-blocking
    }

    return evaluation;
  }

  /**
   * Get all active risk decisions with optional filtering.
   */
  static getAllDecisions(filters?: {
    subjectType?: RiskSubjectType;
    status?: RiskDecisionStatus;
    minScore?: number;
    search?: string;
  }): RiskDecision[] {
    let decisions = Array.from(decisionStore.values());

    if (filters) {
      if (filters.subjectType) {
        decisions = decisions.filter((d) => d.subjectType === filters.subjectType);
      }
      if (filters.status) {
        decisions = decisions.filter((d) => d.status === filters.status);
      }
      if (typeof filters.minScore === 'number') {
        decisions = decisions.filter((d) => d.riskScore >= filters.minScore!);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        decisions = decisions.filter(
          (d) =>
            d.riskId.toLowerCase().includes(q) ||
            d.subjectId.toLowerCase().includes(q) ||
            (d.subjectName && d.subjectName.toLowerCase().includes(q)) ||
            d.riskType.toLowerCase().includes(q),
        );
      }
    }

    // Sort by riskScore descending
    return decisions.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Get single decision by riskId.
   */
  static getDecisionById(riskId: string): RiskDecision | null {
    return decisionStore.get(riskId) || null;
  }

  /**
   * Transition decision status (ACKNOWLEDGE, DISMISS, ESCALATE, RESOLVE).
   */
  static async updateStatus(
    riskId: string,
    newStatus: RiskDecisionStatus,
    operatorId: string,
  ): Promise<RiskDecision | null> {
    const decision = decisionStore.get(riskId);
    if (!decision) return null;

    const nowIso = new Date().toISOString();
    decision.status = newStatus;
    decision.updatedAt = nowIso;

    if (newStatus === 'ACKNOWLEDGED') {
      decision.acknowledgedBy = operatorId;
      decision.acknowledgedAt = nowIso;
    } else if (newStatus === 'DISMISSED') {
      decision.dismissedBy = operatorId;
      decision.dismissedAt = nowIso;
    } else if (newStatus === 'ESCALATED') {
      decision.escalatedBy = operatorId;
      decision.escalatedAt = nowIso;
    } else if (newStatus === 'RESOLVED') {
      decision.resolvedAt = nowIso;
    }

    return decision;
  }

  /**
   * Compute Risk Overview Summary KPIs.
   */
  static getOverviewSummary(): RiskOverviewSummary {
    const decisions = Array.from(decisionStore.values());

    const subjectBreakdown: Record<RiskSubjectType, number> = {
      CUSTOMER: 0,
      DRIVER: 0,
      BOOKING: 0,
      PAYMENT: 0,
      REFERRAL: 0,
      PROMOTION: 0,
      ACCOUNT: 0,
      CORPORATE_ACCOUNT: 0,
    };

    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let reviewRequiredCount = 0;

    decisions.forEach((d) => {
      subjectBreakdown[d.subjectType] = (subjectBreakdown[d.subjectType] || 0) + 1;

      if (d.riskLevel === 'CRITICAL') criticalCount++;
      else if (d.riskLevel === 'HIGH') highCount++;
      else if (d.riskLevel === 'MEDIUM') mediumCount++;
      else if (d.riskLevel === 'LOW') lowCount++;

      if (d.status === 'REVIEW_REQUIRED' || d.status === 'DETECTED') {
        reviewRequiredCount++;
      }
    });

    const latestDecisions = decisions
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      totalActiveRisks: decisions.length,
      criticalRisksCount: criticalCount,
      highRisksCount: highCount,
      mediumRisksCount: mediumCount,
      lowRisksCount: lowCount,
      reviewRequiredCount,
      subjectBreakdown,
      latestDecisions,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Seed default real sample risk decisions if empty (for UI/Integration validation).
   */
  static ensureInitialSeed(): void {
    if (decisionStore.size > 0) return;

    // Seed 1: Payment Anomaly (High)
    this.evaluateAndStore({
      subjectType: 'PAYMENT',
      subjectId: 'cust_88329',
      subjectName: 'Customer #88329 (Rohan Verma)',
      riskType: 'PAYMENT_ANOMALY',
      paymentContext: {
        userId: 'cust_88329',
        failedPayments24h: 4,
        paymentRetryFrequency1h: 6,
        refundAnomaliesDetected: true,
        paymentStateMismatch: false,
      },
      bookingContext: {
        customerId: 'cust_88329',
        bookingVelocity1h: 4,
        failedAssignments24h: 1,
        unusualRoutePattern: false,
      },
    });

    // Seed 2: Referral Abuse (Critical)
    this.evaluateAndStore({
      subjectType: 'REFERRAL',
      subjectId: 'ref_9921',
      subjectName: 'Referral Code #REF-MUMBAI-99',
      riskType: 'REFERRAL_ABUSE',
      referralContext: {
        referrerId: 'cust_77210',
        refereeId: 'cust_77211',
        isSameUserOrDevice: true,
        circularReferralDetected: true,
        rapidReferralCount24h: 9,
      },
    });

    // Seed 3: Driver Telemetry Jump (High)
    this.evaluateAndStore({
      subjectType: 'DRIVER',
      subjectId: 'drv_3401',
      subjectName: 'Driver #3401 (Vikram Singh)',
      riskType: 'LOCATION_TELEMETRY_ANOMALY',
      locationContext: {
        driverId: 'drv_3401',
        impossibleMovementSpeedKmh: 240,
        locationJumpKm: 65,
        staleTelemetryMinutes: 18,
        isActiveRide: true,
      },
      driverBehaviorContext: {
        driverId: 'drv_3401',
        rejectedAssignments24h: 7,
        unusualTripDeviations: 3,
        lowRatingSpike: false,
      },
    });
  }
}

// Ensure seed on load
RiskDecisionService.ensureInitialSeed();
