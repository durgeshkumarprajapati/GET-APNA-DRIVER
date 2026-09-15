import { IncidentClassificationService } from '@/modules/trip-reliability/incident-classification-service';

describe('IncidentClassificationService', () => {
  let classificationService: IncidentClassificationService;

  beforeEach(() => {
    classificationService = new IncidentClassificationService();
  });

  it('should classify SAFETY_ESCALATION as CRITICAL severity with HIGH confidence', () => {
    const classification = classificationService.classifyIncident('SAFETY_ESCALATION');
    expect(classification.severity).toBe('CRITICAL');
    expect(classification.confidence).toBe('HIGH');
  });

  it('should classify active safety incident as CRITICAL severity regardless of type', () => {
    const classification = classificationService.classifyIncident('ASSIGNMENT_TIMEOUT', true);
    expect(classification.severity).toBe('CRITICAL');
    expect(classification.confidence).toBe('HIGH');
  });

  it('should classify ASSIGNMENT_TIMEOUT as MEDIUM severity', () => {
    const classification = classificationService.classifyIncident('ASSIGNMENT_TIMEOUT');
    expect(classification.severity).toBe('MEDIUM');
    expect(classification.confidence).toBe('HIGH');
  });

  it('should classify DRIVER_LOCATION_STALE as LOW severity', () => {
    const classification = classificationService.classifyIncident('DRIVER_LOCATION_STALE');
    expect(classification.severity).toBe('LOW');
    expect(classification.confidence).toBe('MEDIUM');
  });
});
