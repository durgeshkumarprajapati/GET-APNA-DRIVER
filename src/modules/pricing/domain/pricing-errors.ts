export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingError';
  }
}

export class InvalidRouteCoordinatesError extends PricingError {
  constructor(latitude: number, longitude: number) {
    super(`Invalid route coordinates: latitude=${latitude}, longitude=${longitude}`);
    this.name = 'InvalidRouteCoordinatesError';
  }
}

export class RouteEstimationFailedError extends PricingError {
  constructor(reason: string) {
    super(`Route estimation failed: ${reason}`);
    this.name = 'RouteEstimationFailedError';
  }
}
