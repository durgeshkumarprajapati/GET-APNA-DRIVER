import { rankAndLimitRecommendations } from '@/modules/experience/application/experience-ranking-service';
import {
  buildRecommendation,
  createExperienceFingerprint,
} from '@/modules/experience/domain/experience-recommendation';

describe('Experience Orchestration Engine', () => {
  it('should rank mandatory recommendations above non-mandatory items regardless of priority score', () => {
    const rec1 = buildRecommendation({
      type: 'BOOK_AGAIN',
      category: 'CUSTOMER',
      title: 'Book Again',
      description: 'Test',
      reason: 'Test',
      priority: 99,
      isMandatory: false,
      fingerprint: 'fp_1',
      action: { type: 'OPEN_BOOKING_PREFILLED' },
    });

    const rec2 = buildRecommendation({
      type: 'SAFETY',
      category: 'CUSTOMER',
      title: 'Safety Alert',
      description: 'Test',
      reason: 'Test',
      priority: 80,
      isMandatory: true,
      fingerprint: 'fp_2',
      action: { type: 'NAVIGATE_PAGE' },
    });

    const ranked = rankAndLimitRecommendations([rec1, rec2], new Set());
    expect(ranked[0].type).toBe('SAFETY');
    expect(ranked[1].type).toBe('BOOK_AGAIN');
  });

  it('should filter out dismissed recommendations unless they are mandatory', () => {
    const recDismissable = buildRecommendation({
      type: 'PROMOTION',
      category: 'CUSTOMER',
      title: 'Promo',
      description: 'Test',
      reason: 'Test',
      priority: 45,
      isDismissable: true,
      fingerprint: 'fp_dismissed',
      action: { type: 'NAVIGATE_PAGE' },
    });

    const recMandatory = buildRecommendation({
      type: 'ACTIVE_TRIP',
      category: 'CUSTOMER',
      title: 'Active Trip',
      description: 'Test',
      reason: 'Test',
      priority: 90,
      isMandatory: true,
      fingerprint: 'fp_mandatory_dismissed',
      action: { type: 'NAVIGATE_PAGE' },
    });

    const dismissedSet = new Set(['fp_dismissed', 'fp_mandatory_dismissed']);
    const ranked = rankAndLimitRecommendations([recDismissable, recMandatory], dismissedSet);

    expect(ranked).toHaveLength(1);
    expect(ranked[0].fingerprint).toBe('fp_mandatory_dismissed');
  });

  it('should create deterministic fingerprints for duplicate protection', () => {
    const fp1 = createExperienceFingerprint('user-1', 'BOOK_AGAIN', 'booking-100');
    const fp2 = createExperienceFingerprint('user-1', 'BOOK_AGAIN', 'booking-100');
    const fp3 = createExperienceFingerprint('user-2', 'BOOK_AGAIN', 'booking-100');

    expect(fp1).toBe(fp2);
    expect(fp1).not.toBe(fp3);
  });
});
