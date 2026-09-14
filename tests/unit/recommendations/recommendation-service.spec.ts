import { deduplicateCandidates } from '@/modules/recommendations/application/services/recommendation-deduplication-service';
import {
  type CandidateRecommendation,
  RecommendationType,
  RecommendationPriority,
  RecommendationActionType,
} from '@/modules/recommendations/domain/recommendation-types';

describe('Candidate Deduplication Service Unit Tests', () => {
  it('deduplicates candidates sharing the same candidate ID', () => {
    const candidates: CandidateRecommendation[] = [
      {
        id: 'dup1',
        type: RecommendationType.USUAL_ROUTE,
        priority: RecommendationPriority.P1,
        rawScore: 70,
        titleKey: 'title.1',
        explanationKey: 'expl.1',
        action: { type: RecommendationActionType.BOOK_NOW, href: '/bookings/new' },
      },
      {
        id: 'dup1',
        type: RecommendationType.USUAL_ROUTE,
        priority: RecommendationPriority.P1,
        rawScore: 70,
        titleKey: 'title.1',
        explanationKey: 'expl.1',
        action: { type: RecommendationActionType.BOOK_NOW, href: '/bookings/new' },
      },
    ];

    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('dup1');
  });

  it('deduplicates candidates sharing the same routeKey', () => {
    const candidates: CandidateRecommendation[] = [
      {
        id: 'usual_1',
        type: RecommendationType.USUAL_ROUTE,
        priority: RecommendationPriority.P1,
        rawScore: 80,
        routeKey: 'route_hash_xyz',
        titleKey: 'title.usual',
        explanationKey: 'expl.usual',
        action: { type: RecommendationActionType.BOOK_NOW, href: '/bookings/new' },
      },
      {
        id: 'recent_1',
        type: RecommendationType.BOOK_AGAIN,
        priority: RecommendationPriority.P1,
        rawScore: 65,
        routeKey: 'route_hash_xyz',
        titleKey: 'title.recent',
        explanationKey: 'expl.recent',
        action: { type: RecommendationActionType.BOOK_AGAIN, href: '/bookings/new' },
      },
    ];

    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('usual_1');
  });
});
