import 'server-only';
import { env } from '@/shared/config/env';
import { logger } from '@/shared/logging/logger';

export interface SendEmailInput {
  toEmail: string;
  subject: string;
  bodyText: string;
  htmlBody?: string;
}

export interface SendEmailResult {
  messageId?: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  error?: string;
}

export interface EmailProvider {
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
}

export function maskEmailAddress(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***';
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

/**
 * Development Email provider — logs email notification details to terminal stdout without external network requests.
 */
export class DevelopmentEmailProvider implements EmailProvider {
  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const maskedEmail = maskEmailAddress(input.toEmail);

    logger.info(
      { toEmail: maskedEmail, subject: input.subject },
      '[DEV ONLY] Email notification dispatched',
    );

    console.log(
      `\n=========================================\n[DEV EMAIL NOTIFICATION]\nTo: ${input.toEmail}\nSubject: ${input.subject}\nMessage: ${input.bodyText}\n=========================================\n`,
    );

    return {
      messageId: `dev-email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      status: 'delivered',
    };
  }
}

/**
 * Mock Email provider — used in unit test suites for deterministic assertions.
 */
export class MockEmailProvider implements EmailProvider {
  public readonly sentEmails: SendEmailInput[] = [];

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    this.sentEmails.push(input);
    return {
      messageId: `mock-email-${this.sentEmails.length}`,
      status: 'delivered',
    };
  }

  getLastEmail(toEmail?: string): SendEmailInput | undefined {
    if (!toEmail) return this.sentEmails[this.sentEmails.length - 1];
    return [...this.sentEmails].reverse().find((msg) => msg.toEmail === toEmail);
  }

  clear(): void {
    this.sentEmails.length = 0;
  }
}

export function createEmailProvider(): EmailProvider {
  if (env.NODE_ENV === 'test') {
    return new MockEmailProvider();
  }
  return new DevelopmentEmailProvider();
}

export const emailProvider: EmailProvider = createEmailProvider();
