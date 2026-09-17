import 'server-only';
import { evaluateLocationFreshnessState } from '../domain/location-policy';
import type { LocationFreshnessState } from '../domain/location-intelligence-types';

export interface StaleLocationEvaluation {
  isStale: boolean;
  freshnessState: LocationFreshnessState;
  ageSeconds: number;
  explanation: string;
}

export function evaluateStaleLocation(capturedAt?: Date | string | null): StaleLocationEvaluation {
  const { freshness, ageSeconds } = evaluateLocationFreshnessState(capturedAt);
  const isStale = freshness === 'STALE' || freshness === 'UNAVAILABLE';

  let explanation = `Location telemetry is ${freshness.toLowerCase()} (age: ${ageSeconds}s)`;
  if (freshness === 'UNAVAILABLE') {
    explanation = 'Location telemetry is missing or unavailable';
  }

  return {
    isStale,
    freshnessState: freshness,
    ageSeconds,
    explanation,
  };
}
