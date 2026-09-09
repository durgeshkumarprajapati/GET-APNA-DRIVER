import { StatusBadge, type StatusBadgeTone } from './status-badge';

const STATUS_TONE: Record<string, StatusBadgeTone> = {
  OPEN: 'danger',
  ACKNOWLEDGED: 'warning',
  INVESTIGATING: 'warning',
  ESCALATED: 'danger',
  RESOLVED: 'success',
};

const SEVERITY_TONE: Record<string, StatusBadgeTone> = {
  CRITICAL: 'danger',
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'neutral',
};

/** Shared safety-incident status/severity badges — used by both customer and driver SOS history views. */
export function IncidentStatusBadge({ status }: { status: string }) {
  return <StatusBadge label={status} tone={STATUS_TONE[status] ?? 'neutral'} />;
}

export function IncidentSeverityBadge({ severity }: { severity: string }) {
  return <StatusBadge label={severity} tone={SEVERITY_TONE[severity] ?? 'neutral'} />;
}
