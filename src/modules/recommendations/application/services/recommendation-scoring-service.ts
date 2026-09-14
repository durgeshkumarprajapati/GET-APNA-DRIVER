import 'server-only';
import {
  type CandidateRecommendation,
  type RecommendationDTO,
  type RecommendationContextInput,
  RecommendationPriority,
} from '../../domain/recommendation-types';

const PRIORITY_BASE_WEIGHTS: Record<RecommendationPriority, number> = {
  [RecommendationPriority.P0]: 40,
  [RecommendationPriority.P1]: 30,
  [RecommendationPriority.P2]: 20,
  [RecommendationPriority.P3]: 10,
};

export class DeterministicRecommendationScorer {
  scoreCandidates(
    candidates: CandidateRecommendation[],
    _context?: RecommendationContextInput,
  ): RecommendationDTO[] {
    return candidates
      .map((c) => {
        const priorityWeight = PRIORITY_BASE_WEIGHTS[c.priority] || 10;
        // Weighted composite score: rawScore (60%) + priorityWeight (40%)
        const compositeScore = c.rawScore * 0.6 + priorityWeight * 1.0;
        const normalizedScore = Number(Math.min(Math.max(compositeScore, 0), 100).toFixed(2));

        const dto: RecommendationDTO = {
          id: c.id,
          type: c.type,
          priority: c.priority,
          score: normalizedScore,
          titleKey: c.titleKey,
          descriptionKey: c.descriptionKey,
          explanationKey: c.explanationKey,
          explanationArgs: c.explanationArgs,
          action: c.action,
          metadata: c.metadata,
        };
        return dto;
      })
      .sort((a, b) => b.score - a.score);
  }
}

export const defaultScorer = new DeterministicRecommendationScorer();
