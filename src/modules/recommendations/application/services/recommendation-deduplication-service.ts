import 'server-only';
import { type CandidateRecommendation } from '../../domain/recommendation-types';

export function deduplicateCandidates(
  candidates: CandidateRecommendation[],
): CandidateRecommendation[] {
  const seenIds = new Set<string>();
  const seenRouteKeys = new Set<string>();
  const result: CandidateRecommendation[] = [];

  for (const candidate of candidates) {
    if (seenIds.has(candidate.id)) {
      continue;
    }

    if (candidate.routeKey) {
      if (seenRouteKeys.has(candidate.routeKey)) {
        continue;
      }
      seenRouteKeys.add(candidate.routeKey);
    }

    seenIds.add(candidate.id);
    result.push(candidate);
  }

  return result;
}
