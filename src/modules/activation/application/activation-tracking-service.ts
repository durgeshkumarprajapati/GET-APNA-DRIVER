import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';

/**
 * Lightweight onboarding-funnel event logging (Phase 87 "track onboarding
 * completion and abandonment") — reuses the existing append-only AuditLog
 * rather than introducing a dedicated analytics/event model. Computing
 * actual completion/abandonment *rates* from these raw events (cohorts,
 * time-to-activate, dashboards) is Phase 99's job; this just emits the
 * events faithfully.
 */
export const CUSTOMER_ACTIVATION_EVENTS = ['first_booking_flow_started'] as const;
export type CustomerActivationEvent = (typeof CUSTOMER_ACTIVATION_EVENTS)[number];

export function isCustomerActivationEvent(value: unknown): value is CustomerActivationEvent {
  return (
    typeof value === 'string' && (CUSTOMER_ACTIVATION_EVENTS as readonly string[]).includes(value)
  );
}

export async function recordCustomerActivationEvent(
  userId: string,
  event: CustomerActivationEvent,
  db: Db = prisma,
): Promise<void> {
  await recordAuditLog(db, {
    actorUserId: userId,
    action: `customer.activation.${event}`,
    entityType: 'User',
    entityId: userId,
  });
}
