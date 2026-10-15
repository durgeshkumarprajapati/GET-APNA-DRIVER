'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { LocationMapModal } from '@/components/maps/location-map-modal';

interface IncidentDetail {
  id: string;
  incidentNumber: string;
  bookingId: string;
  type: string;
  severity: string;
  status: string;
  confidence: string;
  fingerprint: string;
  resolutionCode?: string | null;
  detectedAt: string;
  confirmedAt?: string | null;
  resolvedAt?: string | null;
  escalatedAt?: string | null;
  booking: {
    id: string;
    status: string;
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffAddress?: string | null;
    dropoffLatitude?: number | null;
    dropoffLongitude?: number | null;
  };
  customer?: { id: string } | null;
  driverProfile?: { id: string; userId: string } | null;
  timelineEntries: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string | null;
    action: string;
    actorRole: string;
    notes: string | null;
    createdAt: string;
  }>;
  recoveryAttempts: Array<{
    id: string;
    action: string;
    status: string;
    attemptNumber: number;
    triggeredBy: string;
    driverResponse: string | null;
    failureCode: string | null;
    failureSummary: string | null;
    startedAt: string;
    completedAt: string | null;
  }>;
}

const ATTEMPT_STATUS_TONE: Record<string, StatusBadgeTone> = {
  SUCCEEDED: 'success',
  FAILED: 'danger',
  PROCESSING: 'info',
  PENDING: 'neutral',
  CANCELLED: 'neutral',
};

const SEVERITY_TONE: Record<string, StatusBadgeTone> = {
  CRITICAL: 'danger',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'neutral',
};

export default function AdminIncidentDetailPage({
  params,
}: {
  params: Promise<{ incidentId: string }>;
}) {
  const { incidentId } = use(params);
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/incidents/${incidentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch incident details');
      setIncident(data.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch incident details';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      if (!ignore) {
        await fetchDetail();
      }
    }
    void init();
    return () => {
      ignore = true;
    };
  }, [fetchDetail]);

  const handleTriggerRecovery = async () => {
    setActionPending(true);
    try {
      const res = await fetch(`/api/admin/incidents/${incidentId}/recover`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.data?.notes || 'Recovery execution failed');
      }
      setActionToast(`Recovery triggered: ${data.data?.actionTaken || 'Success'}`);
      await fetchDetail();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Recovery failed';
      setError(message);
    } finally {
      setActionPending(false);
    }
  };

  const handleEscalate = async () => {
    setActionPending(true);
    try {
      const res = await fetch(`/api/admin/incidents/${incidentId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Operator requested emergency escalation.' }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || 'Could not escalate this incident. Please try again.');
      setActionToast('Incident escalated to operational support team.');
      await fetchDetail();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Could not escalate this incident. Please try again.';
      setError(message);
    } finally {
      setActionPending(false);
    }
  };

  const handleResolve = async () => {
    setActionPending(true);
    try {
      const res = await fetch(`/api/admin/incidents/${incidentId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Manually verified and resolved by operator.' }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || 'Could not resolve this incident. Please try again.');
      setActionToast('Incident resolved.');
      await fetchDetail();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Could not resolve this incident. Please try again.';
      setError(message);
    } finally {
      setActionPending(false);
    }
  };

  const handleDismiss = async () => {
    const reason = window.prompt('Reason for dismissing this incident as a false positive:');
    if (!reason || !reason.trim()) return;
    setActionPending(true);
    try {
      const res = await fetch(`/api/admin/incidents/${incidentId}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error || data.message || 'Could not dismiss this incident. Please try again.',
        );
      setActionToast('Incident dismissed as a false positive.');
      await fetchDetail();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Could not dismiss this incident. Please try again.';
      setError(message);
    } finally {
      setActionPending(false);
    }
  };

  if (loading) {
    return (
      <>
        <LoadingState message="Loading incident telemetry and evidence timeline..." />
      </>
    );
  }

  if (error || !incident) {
    return (
      <>
        <div className="p-4 rounded-xl bg-error-container/40 border border-error text-on-error-container text-sm">
          {error || 'Incident record not found'}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Breadcrumb & Navigation Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/incidents"
              className="p-2 rounded-lg bg-surface-container-high hover:bg-border text-on-surface-variant transition-colors"
            >
              ← Back to Control Center
            </Link>
            <div>
              <h1 className="text-xl font-extrabold text-on-surface flex items-center gap-2">
                Incident Control Case: {incident.incidentNumber}
              </h1>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Fingerprint ID:{' '}
                <code className="bg-surface-container-high px-1.5 py-0.5 rounded text-on-warning-container font-mono text-[11px]">
                  {incident.fingerprint}
                </code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge label={incident.status} tone="neutral" />
            <StatusBadge
              label={incident.severity}
              tone={SEVERITY_TONE[incident.severity] || 'neutral'}
            />
          </div>
        </div>

        {actionToast && (
          <div className="p-3 rounded-xl bg-on-primary-container/60 border border-primary-container text-primary text-xs font-semibold flex items-center justify-between">
            <span>{actionToast}</span>
            <button
              onClick={() => setActionToast(null)}
              className="text-primary hover:text-primary"
            >
              ✕
            </button>
          </div>
        )}

        {/* Action Controls Toolbar */}
        <div className="p-4 rounded-2xl bg-surface-container-low/80 border border-surface-container-high flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-on-surface">Operator Recovery Actions</h2>
            <p className="text-xs text-on-surface-variant">
              Trigger authorized recovery routines or escalate for human intervention
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTriggerRecovery}
              disabled={actionPending || incident.status === 'RESOLVED'}
              className="px-4 py-2 rounded-xl bg-warning hover:bg-warning-hover disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors"
            >
              🔄 Trigger Auto Recovery
            </button>

            <button
              onClick={handleEscalate}
              disabled={actionPending || incident.status === 'ESCALATED'}
              className="px-4 py-2 rounded-xl bg-error hover:bg-error-hover disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors"
            >
              🚨 Escalate Incident
            </button>

            <button
              onClick={handleResolve}
              disabled={actionPending || incident.status === 'RESOLVED'}
              className="px-4 py-2 rounded-xl bg-primary-container hover:bg-primary disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors"
            >
              ✅ Mark Resolved
            </button>

            <button
              onClick={handleDismiss}
              disabled={actionPending || incident.status === 'DISMISSED'}
              className="px-4 py-2 rounded-xl bg-border hover:bg-outline disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors"
            >
              🚫 Dismiss (False Positive)
            </button>
          </div>
        </div>

        {/* Incident Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-2">
            <span className="text-xs font-bold uppercase text-on-surface-variant">
              Booking Reference
            </span>
            <p className="text-sm font-bold text-on-surface">Booking ID #{incident.booking.id}</p>
            <p className="text-xs text-on-surface-variant">Status: {incident.booking.status}</p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setMapOpen(true)}
                className="w-full py-1.5 px-3 rounded-lg bg-surface-container-high hover:bg-border text-on-surface font-medium text-xs border border-border"
              >
                🗺️ View Incident Map
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-2">
            <span className="text-xs font-bold uppercase text-on-surface-variant">
              Customer Identity
            </span>
            <p className="text-sm font-bold text-on-surface">
              Customer ID: {incident.customer?.id || incident.booking.id}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-2">
            <span className="text-xs font-bold uppercase text-on-surface-variant">
              Driver Partner
            </span>
            <p className="text-sm font-bold text-on-surface">
              {incident.driverProfile
                ? `Driver Profile #${incident.driverProfile.id}`
                : 'Unassigned / searching'}
            </p>
          </div>
        </div>

        {/* Audit & Action Timeline */}
        <div className="p-6 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-4">
          <h2 className="text-base font-bold text-on-surface">Incident Lifecycle & Audit Log</h2>

          <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-surface-container-high">
            {incident.timelineEntries.map((entry) => (
              <div key={entry.id} className="relative flex items-start gap-4 pl-8">
                <span className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-on-warning-container border-2 border-surface-container-low"></span>
                <div className="flex-1 p-3 rounded-xl bg-surface-container-high/60 border border-border/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-warning-container">
                      {entry.action}
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      {new Date(entry.createdAt).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                      })}
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                      {entry.notes}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-on-surface-variant">
                    <span>
                      Actor Role: <strong>{entry.actorRole}</strong>
                    </span>
                    {entry.fromStatus && entry.toStatus && (
                      <span>
                        • Transition: {entry.fromStatus} → {entry.toStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recovery Attempt History */}
        <div className="p-6 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-4">
          <h2 className="text-base font-bold text-on-surface">Recovery Attempt History</h2>
          {incident.recoveryAttempts.length === 0 ? (
            <EmptyState icon="history" message="No recovery attempts recorded yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-on-surface-variant border-b border-surface-container-high">
                    <th className="py-2 pr-4">#</th>
                    <th className="py-2 pr-4">Action</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Triggered By</th>
                    <th className="py-2 pr-4">Started</th>
                    <th className="py-2 pr-4">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {incident.recoveryAttempts.map((attempt) => (
                    <tr key={attempt.id} className="border-b border-surface-container-high/60">
                      <td className="py-2 pr-4 text-on-surface-variant">{attempt.attemptNumber}</td>
                      <td className="py-2 pr-4 text-on-surface font-mono">{attempt.action}</td>
                      <td className="py-2 pr-4">
                        <StatusBadge
                          label={attempt.status}
                          tone={ATTEMPT_STATUS_TONE[attempt.status] || 'neutral'}
                        />
                      </td>
                      <td className="py-2 pr-4 text-on-surface-variant">
                        {attempt.triggeredBy}
                        {attempt.driverResponse ? ` (${attempt.driverResponse})` : ''}
                      </td>
                      <td className="py-2 pr-4 text-on-surface-variant">
                        {new Date(attempt.startedAt).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                        })}
                      </td>
                      <td className="py-2 pr-4 text-on-surface-variant">
                        {attempt.failureSummary || attempt.failureCode || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {mapOpen && (
          <LocationMapModal
            open={mapOpen}
            onClose={() => setMapOpen(false)}
            title="Incident Pickup & Dropoff Location"
            center={{
              latitude: incident.booking.pickupLatitude,
              longitude: incident.booking.pickupLongitude,
            }}
            markers={[
              {
                id: 'pickup',
                position: {
                  latitude: incident.booking.pickupLatitude,
                  longitude: incident.booking.pickupLongitude,
                },
                type: 'PICKUP',
                title: 'Pickup Location',
              },
            ]}
          />
        )}
      </div>
    </>
  );
}
