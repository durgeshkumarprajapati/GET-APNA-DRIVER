import 'server-only';
import { evaluateLocationConfidence, detectLocationAnomaly } from '../domain/location-confidence';
import { recordLocationAnomalyMetric } from '../infrastructure/location-telemetry';
import type {
  LocationPoint,
  LocationConfidenceAssessment,
  LocationAnomalyReport,
} from '../domain/location-intelligence-types';

export function assessLocationConfidence(point: LocationPoint): LocationConfidenceAssessment {
  return evaluateLocationConfidence(point);
}

export function checkLocationAnomaly(
  previousPoint: LocationPoint | null,
  currentPoint: LocationPoint,
  distanceMeters: number,
): LocationAnomalyReport {
  const report = detectLocationAnomaly(previousPoint, currentPoint, distanceMeters);
  if (report.isAnomaly && report.type) {
    recordLocationAnomalyMetric(report.type);
  }
  return report;
}
