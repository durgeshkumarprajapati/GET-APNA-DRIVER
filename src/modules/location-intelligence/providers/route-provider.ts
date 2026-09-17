import 'server-only';
import type { RouteEstimateRequest, ETAResult } from '../domain/eta-types';

export interface RouteProvider {
  providerName: 'GOOGLE' | 'MAPBOX' | 'DETERMINISTIC_FALLBACK';
  estimateRoute(request: RouteEstimateRequest): Promise<ETAResult>;
  isAvailable(): Promise<boolean>;
}
