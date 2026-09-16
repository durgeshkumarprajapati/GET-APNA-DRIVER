import {
  RiskConfidence,
  RiskDecision,
  RiskLevel,
  RiskRuleResult,
  RiskSignal,
  RiskSubjectType,
} from '../domain/risk-types';
import { evaluateAccountAbuse, AccountAbuseContext } from '../rules/account-abuse-rule';
import { evaluateReferralAbuse, ReferralAbuseContext } from '../rules/referral-abuse-rule';
import { evaluatePromotionAbuse, PromotionAbuseContext } from '../rules/promotion-abuse-rule';
import { evaluatePaymentAnomaly, PaymentAnomalyContext } from '../rules/payment-anomaly-rule';
import {
  evaluateCancellationAbuse,
  CancellationAbuseContext,
} from '../rules/cancellation-abuse-rule';
import { evaluateBookingAnomaly, BookingAnomalyContext } from '../rules/booking-anomaly-rule';
import { evaluateLocationAnomaly, LocationAnomalyContext } from '../rules/location-anomaly-rule';
import { evaluateDriverBehavior, DriverBehaviorContext } from '../rules/driver-behavior-rule';
import { evaluateWalletAnomaly, WalletAnomalyContext } from '../rules/wallet-anomaly-rule';
import { evaluateSupportAbuse, SupportAbuseContext } from '../rules/support-abuse-rule';

export interface RiskEvaluationRequest {
  subjectType: RiskSubjectType;
  subjectId: string;
  subjectName?: string;
  riskType: string;
  accountContext?: AccountAbuseContext;
  referralContext?: ReferralAbuseContext;
  promotionContext?: PromotionAbuseContext;
  paymentContext?: PaymentAnomalyContext;
  cancellationContext?: CancellationAbuseContext;
  bookingContext?: BookingAnomalyContext;
  locationContext?: LocationAnomalyContext;
  driverBehaviorContext?: DriverBehaviorContext;
  walletContext?: WalletAnomalyContext;
  supportContext?: SupportAbuseContext;
  additionalSignals?: RiskSignal[];
}

export class RiskEvaluationService {
  /**
   * Deterministically evaluate risk across all rules and signals.
   */
  static evaluateRisk(req: RiskEvaluationRequest): RiskDecision {
    const ruleResults: RiskRuleResult[] = [];

    if (req.accountContext) ruleResults.push(evaluateAccountAbuse(req.accountContext));
    if (req.referralContext) ruleResults.push(evaluateReferralAbuse(req.referralContext));
    if (req.promotionContext) ruleResults.push(evaluatePromotionAbuse(req.promotionContext));
    if (req.paymentContext) ruleResults.push(evaluatePaymentAnomaly(req.paymentContext));
    if (req.cancellationContext)
      ruleResults.push(evaluateCancellationAbuse(req.cancellationContext));
    if (req.bookingContext) ruleResults.push(evaluateBookingAnomaly(req.bookingContext));
    if (req.locationContext) ruleResults.push(evaluateLocationAnomaly(req.locationContext));
    if (req.driverBehaviorContext)
      ruleResults.push(evaluateDriverBehavior(req.driverBehaviorContext));
    if (req.walletContext) ruleResults.push(evaluateWalletAnomaly(req.walletContext));
    if (req.supportContext) ruleResults.push(evaluateSupportAbuse(req.supportContext));

    const triggeredRules = ruleResults.filter((r) => r.triggered);
    let totalScore = triggeredRules.reduce((sum, r) => sum + r.scoreContribution, 0);

    // Incorporate additional signals weight
    if (req.additionalSignals && req.additionalSignals.length > 0) {
      const signalContribution = req.additionalSignals.reduce((s, sig) => s + sig.weight, 0);
      totalScore += Math.round(signalContribution * 0.5);
    }

    // Cap score deterministically between 0 and 100
    const riskScore = Math.min(Math.max(totalScore, 0), 100);

    // Determine Risk Level: 0-24 LOW, 25-49 MEDIUM, 50-74 HIGH, 75-100 CRITICAL
    let riskLevel: RiskLevel = 'LOW';
    if (riskScore >= 75) {
      riskLevel = 'CRITICAL';
    } else if (riskScore >= 50) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 25) {
      riskLevel = 'MEDIUM';
    }

    // Determine Confidence based on corroborating rules/signals
    let confidence: RiskConfidence = 'LOW';
    if (triggeredRules.length >= 3 || riskScore >= 75) {
      confidence = 'HIGH';
    } else if (triggeredRules.length >= 2 || riskScore >= 40) {
      confidence = 'MEDIUM';
    }

    // Collect evidence bullet points
    const evidenceItems: string[] = [];
    triggeredRules.forEach((r) => {
      evidenceItems.push(...r.evidence);
    });
    if (req.additionalSignals) {
      req.additionalSignals.forEach((sig) => {
        evidenceItems.push(`${sig.name}: ${sig.description}`);
      });
    }

    if (evidenceItems.length === 0) {
      evidenceItems.push('No suspicious signals or policy anomalies detected for this subject.');
    }

    // Determine primary recommendation
    let recommendedActionTitle = 'No immediate action required';
    if (riskLevel === 'CRITICAL') {
      recommendedActionTitle = 'Require Immediate Operator Review & Safety Step-Up Verification';
    } else if (riskLevel === 'HIGH') {
      recommendedActionTitle = 'Flag for Review & Step-Up Security Check';
    } else if (riskLevel === 'MEDIUM') {
      recommendedActionTitle = 'Monitor Subject Velocity & Issue Soft Policy Warning';
    }

    // Generate deterministic timeBucket (1-hour bucket) for fingerprinting
    const hourBucket = Math.floor(Date.now() / (3600 * 1000));
    const fingerprint = `${req.subjectId}:${req.riskType}:${hourBucket}`;
    const riskId = `risk_${req.subjectType.toLowerCase()}_${req.subjectId}_${Date.now()}`;
    const nowIso = new Date().toISOString();

    return {
      riskId,
      subjectType: req.subjectType,
      subjectId: req.subjectId,
      subjectName: req.subjectName || `${req.subjectType} #${req.subjectId}`,
      riskType: req.riskType,
      riskScore,
      riskLevel,
      confidence,
      status: riskScore >= 50 ? 'REVIEW_REQUIRED' : 'DETECTED',
      fingerprint,
      signals: req.additionalSignals || [],
      evidence: {
        what: `${riskLevel} Risk Detected (${req.riskType})`,
        why: `Calculated risk score of ${riskScore}/100 across ${triggeredRules.length} triggered safety rules.`,
        evidenceItems,
        confidence,
        recommendedAction: recommendedActionTitle,
      },
      recommendedActions: [
        {
          actionId: `act_rev_${riskId}`,
          title: 'Flag Subject for Operator Manual Review',
          description:
            'Adds subject to the high-priority risk review queue in Operations Command Center.',
          actionType: 'FLAG_FOR_REVIEW',
          isAutomatedAllowed: true,
          requiresOperatorApproval: false,
        },
        {
          actionId: `act_step_${riskId}`,
          title: 'Request Step-Up Identity / OTP Verification',
          description:
            'Prompts user for OTP / identity confirmation before next sensitive booking or withdrawal.',
          actionType: 'REQUIRE_STEP_UP',
          isAutomatedAllowed: false,
          requiresOperatorApproval: true,
        },
        {
          actionId: `act_lim_${riskId}`,
          title: 'Limit Dispatch Offer Rate',
          description: 'Temporarily reduces automated high-velocity dispatch matching offers.',
          actionType: 'LIMIT_DISPATCH_OFFERS',
          isAutomatedAllowed: false,
          requiresOperatorApproval: true,
        },
      ],
      updatedAt: nowIso,
      createdAt: nowIso,
    };
  }
}
