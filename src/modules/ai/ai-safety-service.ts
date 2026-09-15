export class AISafetyService {
  private injectionPatterns = [
    /ignore (all )?previous instructions/i,
    /override (system )?rules/i,
    /you are now an administrator/i,
    /grant me full access/i,
    /show me all database records/i,
    /bypass security/i,
    /drop table/i,
    /<script>/i,
  ];

  isPromptInjection(message: string): boolean {
    return this.injectionPatterns.some((pattern) => pattern.test(message));
  }

  isEmergencySOS(message: string): boolean {
    const text = message.toLowerCase();
    return (
      text.includes('sos') ||
      text.includes('emergency') ||
      text.includes('threat') ||
      text.includes('danger') ||
      text.includes('police') ||
      text.includes('being attacked') ||
      text.includes('accident')
    );
  }
}
