import 'server-only';
import { AppError } from '@/shared/errors/app-error';

export class InvalidCoordinatesError extends AppError {
  constructor(lat: number, lng: number) {
    super(
      `Invalid geographic coordinates: latitude ${lat}, longitude ${lng}.`,
      400,
      'INVALID_COORDINATES',
    );
    this.name = 'InvalidCoordinatesError';
  }
}

export class LocationStaleError extends AppError {
  constructor(staleSeconds: number) {
    super(`Location update is stale (older than ${staleSeconds} seconds).`, 400, 'LOCATION_STALE');
    this.name = 'LocationStaleError';
  }
}

export class LocationRateLimitError extends AppError {
  constructor(minIntervalSeconds: number) {
    super(
      `Location update rate limit exceeded. Minimum update interval is ${minIntervalSeconds} seconds.`,
      429,
      'LOCATION_RATE_LIMIT_EXCEEDED',
    );
    this.name = 'LocationRateLimitError';
  }
}

export class AccuracyThresholdExceededError extends AppError {
  constructor(accuracy: number, maxAccuracy: number) {
    super(
      `Location accuracy ${accuracy}m exceeds maximum allowed threshold of ${maxAccuracy}m.`,
      400,
      'ACCURACY_THRESHOLD_EXCEEDED',
    );
    this.name = 'AccuracyThresholdExceededError';
  }
}
