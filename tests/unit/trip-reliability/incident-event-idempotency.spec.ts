import { IncidentEventService } from '@/modules/trip-reliability/incident-event-service';

describe('Incident Event Idempotency & Fingerprinting', () => {
  let eventService: IncidentEventService;

  beforeEach(() => {
    eventService = new IncidentEventService();
  });

  it('should generate identical fingerprint for same booking, incident type, and time bucket', () => {
    const bookingId = 'b999';
    const type = 'ASSIGNMENT_TIMEOUT';
    const bucket = '2026-09-15T10:00';

    const fp1 = eventService.generateFingerprint(bookingId, type, bucket);
    const fp2 = eventService.generateFingerprint(bookingId, type, bucket);

    expect(fp1).toBe(fp2);
    expect(fp1).toBe('b999:ASSIGNMENT_TIMEOUT:2026-09-15T10:00');
  });

  it('should generate different fingerprint for different incident type or time bucket', () => {
    const bookingId = 'b999';
    const bucket = '2026-09-15T10:00';

    const fp1 = eventService.generateFingerprint(bookingId, 'ASSIGNMENT_TIMEOUT', bucket);
    const fp2 = eventService.generateFingerprint(bookingId, 'PICKUP_DELAY', bucket);

    expect(fp1).not.toBe(fp2);
  });
});
