import { RiskDecision } from '../domain/risk-types';

export interface RiskExplanationSummary {
  riskId: string;
  headline: string;
  severityLabel: string;
  confidenceLabel: string;
  scoreDisplay: string;
  keyFactors: string[];
  recommendedSteps: string[];
}

export class RiskExplanationService {
  static explainDecision(decision: RiskDecision): RiskExplanationSummary {
    const keyFactors =
      decision.evidence.evidenceItems.length > 0
        ? decision.evidence.evidenceItems
        : ['No specific anomalous triggers identified.'];

    const recommendedSteps = decision.recommendedActions.map(
      (a) => `${a.title}: ${a.description}${a.executed ? ' (EXECUTED)' : ''}`,
    );

    return {
      riskId: decision.riskId,
      headline: `${decision.riskLevel} Risk on ${decision.subjectType} (${decision.riskType})`,
      severityLabel: decision.riskLevel,
      confidenceLabel: decision.confidence,
      scoreDisplay: `${decision.riskScore} / 100`,
      keyFactors,
      recommendedSteps,
    };
  }
}
