'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ControlStationLayout } from '@/components/control-station-layout';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
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
}

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
      if (!res.ok) throw new Error(data.error || 'Escalation failed');
      setActionToast('Incident escalated to operational support team.');
      await fetchDetail();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Escalation failed';
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
      if (!res.ok) throw new Error(data.error || 'Resolution failed');
      setActionToast('Incident resolved.');
      await fetchDetail();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Resolution failed';
      setError(message);
    } finally {
      setActionPending(false);
    }
  };

  if (loading) {
    return (
      <ControlStationLayout activePersona="admin">
        <LoadingState message="Loading incident telemetry and evidence timeline..." />
      </ControlStationLayout>
    );
  }

  if (error || !incident) {
    return (
      <ControlStationLayout activePersona="admin">
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm">
          {error || 'Incident record not found'}
        </div>
      </ControlStationLayout>
    );
  }

  return (
    <ControlStationLayout activePersona="admin">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Breadcrumb & Navigation Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/incidents"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              ← Back to Control Center
            </Link>
            <div>
              <h1 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                Incident Control Case: {incident.incidentNumber}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Fingerprint ID:{' '}
                <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono text-[11px]">
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
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center justify-between">
            <span>{actionToast}</span>
            <button
              onClick={() => setActionToast(null)}
              className="text-emerald-400 hover:text-emerald-200"
            >
              ✕
            </button>
          </div>
        )}

        {/* Action Controls Toolbar */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-200">Operator Recovery Actions</h2>
            <p className="text-xs text-slate-400">
              Trigger authorized recovery routines or escalate for human intervention
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTriggerRecovery}
              disabled={actionPending || incident.status === 'RESOLVED'}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors"
            >
              🔄 Trigger Auto Recovery
            </button>

            <button
              onClick={handleEscalate}
              disabled={actionPending || incident.status === 'ESCALATED'}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors"
            >
              🚨 Escalate Incident
            </button>

            <button
              onClick={handleResolve}
              disabled={actionPending || incident.status === 'RESOLVED'}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors"
            >
              ✅ Mark Resolved
            </button>
          </div>
        </div>

        {/* Incident Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-xs font-bold uppercase text-slate-400">Booking Reference</span>
            <p className="text-sm font-bold text-slate-100">Booking ID #{incident.booking.id}</p>
            <p className="text-xs text-slate-400">Status: {incident.booking.status}</p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setMapOpen(true)}
                className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700"
              >
                🗺️ View Incident Map
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-xs font-bold uppercase text-slate-400">Customer Identity</span>
            <p className="text-sm font-bold text-slate-100">
              Customer ID: {incident.customer?.id || incident.booking.id}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-xs font-bold uppercase text-slate-400">Driver Partner</span>
            <p className="text-sm font-bold text-slate-100">
              {incident.driverProfile
                ? `Driver Profile #${incident.driverProfile.id}`
                : 'Unassigned / searching'}
            </p>
          </div>
        </div>

        {/* Audit & Action Timeline */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-slate-100">Incident Lifecycle & Audit Log</h2>

          <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
            {incident.timelineEntries.map((entry) => (
              <div key={entry.id} className="relative flex items-start gap-4 pl-8">
                <span className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-900"></span>
                <div className="flex-1 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">{entry.action}</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(entry.createdAt).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                      })}
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{entry.notes}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
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
    </ControlStationLayout>
  );
}
