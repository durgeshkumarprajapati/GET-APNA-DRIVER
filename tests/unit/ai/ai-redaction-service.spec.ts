import { AIRedactionService } from '@/modules/ai/ai-redaction-service';

describe('AIRedactionService Unit Tests', () => {
  const redactionService = new AIRedactionService();

  it('should redact 6-digit OTP codes', () => {
    const text = 'My OTP code is 123456 for authentication';
    const redacted = redactionService.redactText(text);
    expect(redacted).not.toContain('123456');
    expect(redacted).toContain('[OTP_REDACTED]');
  });

  it('should redact 10-digit phone numbers', () => {
    const text = 'Call customer at 9876543210 immediately';
    const redacted = redactionService.redactText(text);
    expect(redacted).not.toContain('9876543210');
    expect(redacted).toContain('[PHONE_REDACTED]');
  });

  it('should redact passwords and secrets from context object', () => {
    const context = {
      userId: 'user-123',
      password: 'secretPassword123!',
      token: 'bearer xyz789',
      pickup: 'Airport',
    };
    const redactedContext = redactionService.redactContext(context);
    expect(redactedContext.password).toBe('[REDACTED]');
    expect(redactedContext.token).toBe('[REDACTED]');
    expect(redactedContext.pickup).toBe('Airport');
  });
});
