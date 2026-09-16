export class AIRedactionService {
  redactText(text: string): string {
    if (!text) return '';

    let redacted = text;

    // Redact password parameters
    redacted = redacted.replace(/(password|passwd|pwd)\s*=\s*['"]?[^'"]+['"]?/gi, '$1=[REDACTED]');

    // Redact 6-digit OTPs / verification codes
    redacted = redacted.replace(/\b\d{6}\b/g, '[OTP_REDACTED]');

    // Redact JWT tokens or auth headers
    redacted = redacted.replace(/(bearer|token)\s+[A-Za-z0-9._-]+/gi, '$1 [TOKEN_REDACTED]');

    // Redact 10-digit phone numbers
    redacted = redacted.replace(/\b(\+?91[\-\s]?)?[6-9]\d{9}\b/g, '[PHONE_REDACTED]');

    // Redact internal UUIDs if matching exact pattern
    redacted = redacted.replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      '[ID_REDACTED]',
    );

    return redacted;
  }

  redactContext<T extends Record<string, unknown>>(context: T): T {
    const copy = JSON.parse(JSON.stringify(context));
    this.walkAndRedact(copy);
    return copy;
  }

  private walkAndRedact(obj: Record<string, unknown>) {
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();

      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('otp') ||
        lowerKey.includes('cvv') ||
        lowerKey.includes('cardnumber')
      ) {
        obj[key] = '[REDACTED]';
        continue;
      }

      if (typeof obj[key] === 'string') {
        obj[key] = this.redactText(obj[key] as string);
      } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        this.walkAndRedact(obj[key] as Record<string, unknown>);
      }
    }
  }
}
