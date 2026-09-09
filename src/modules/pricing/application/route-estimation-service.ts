import 'server-only';
import { defaultRouteProvider, type RouteProvider } from '../infrastructure/route-provider';
import type { RouteEstimate, RouteEstimateInput } from '../domain/pricing-types';

export async function estimateRoute(
  input: RouteEstimateInput,
  provider: RouteProvider = defaultRouteProvider,
): Promise<RouteEstimate> {
  return await provider.estimateRoute(input);
}
