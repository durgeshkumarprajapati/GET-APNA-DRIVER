import type { ExperienceRecommendation } from '../domain/experience-types';
import { isRecommendationExpired } from '../domain/experience-recommendation';

export function rankAndLimitRecommendations(
  recommendations: ExperienceRecommendation[],
  dismissedFingerprints: Set<string>,
  maxLimit: number = 6,
): ExperienceRecommendation[] {
  const filtered = recommendations.filter((rec) => {
    // Exclude expired items
    if (isRecommendationExpired(rec)) {
      return false;
    }
    // Exclude dismissed items unless mandatory
    if (!rec.isMandatory && dismissedFingerprints.has(rec.fingerprint)) {
      return false;
    }
    return true;
  });

  // Sort deterministically:
  // 1. Mandatory items first
  // 2. Higher priority score first
  // 3. Alphabetical fingerprint tiebreaker for exact determinism
  filtered.sort((a, b) => {
    if (a.isMandatory !== b.isMandatory) {
      return a.isMandatory ? -1 : 1;
    }
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.fingerprint.localeCompare(b.fingerprint);
  });

  return filtered.slice(0, maxLimit);
}
