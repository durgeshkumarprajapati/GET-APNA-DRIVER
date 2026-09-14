import { DeterministicRecommendationScorer } from '@/modules/recommendations/application/services/recommendation-scoring-service';
import {
  type CandidateRecommendation,
  RecommendationType,
  RecommendationPriority,
  RecommendationActionType,
} from '@/modules/recommendations/domain/recommendation-types';

describe('DeterministicRecommendationScorer Unit Tests', () => {
  const scorer = new DeterministicRecommendationScorer();

  it('correctly scores, normalizes, and sorts candidate recommendations', () => {
    const candidates: CandidateRecommendation[] = [
      {
        id: 'c1',
        type: RecommendationType.VEHICLE_PREFERENCE,
        priority: RecommendationPriority.P2,
        rawScore: 50,
        titleKey: 'title.pref',
        explanationKey: 'expl.pref',
        action: { type: RecommendationActionType.BOOK_NOW, href: '/bookings/new' },
      },
      {
        id: 'c2',
        type: RecommendationType.UPCOMING_SCHEDULED_RIDE,
        priority: RecommendationPriority.P0,
        rawScore: 90,
        titleKey: 'title.sched',
        explanationKey: 'expl.sched',
        action: { type: RecommendationActionType.VIEW_SCHEDULED_RIDE, href: '/customer/dashboard' },
      },
    ];

    const scored = scorer.scoreCandidates(candidates);

    expect(scored).toHaveLength(2);
    // Scheduled ride P0 (raw 90, priority weight 40 => 90*0.6 + 40 = 94) should be first
    expect(scored[0].id).toBe('c2');
    expect(scored[0].score).toBe(94);

    // P2 candidate (raw 50, priority weight 20 => 50*0.6 + 20 = 50)
    expect(scored[1].id).toBe('c1');
    expect(scored[1].score).toBe(50);
  });

  it('caps scores to 100.00 maximum', () => {
    const candidates: CandidateRecommendation[] = [
      {
        id: 'c_high',
        type: RecommendationType.UPCOMING_SCHEDULED_RIDE,
        priority: RecommendationPriority.P0,
        rawScore: 120, // Excessive raw score
        titleKey: 'title.high',
        explanationKey: 'expl.high',
        action: { type: RecommendationActionType.VIEW_SCHEDULED_RIDE, href: '/customer/dashboard' },
      },
    ];

    const scored = scorer.scoreCandidates(candidates);
    expect(scored[0].score).toBe(100);
  });
});
