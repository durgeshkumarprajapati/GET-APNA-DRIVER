'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';

interface TimelineEntry {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  performedBy: string;
  notes: string | null;
  createdAt: string;
}

interface IncidentDetail {
  id: string;
  incidentNumber: string;
  type: string;
  severity: string;
  status: string;
  bookingId: string | null;
  reporterUserId: string;
  customerId: string | null;
  driverProfileId: string | null;
  assignedOperatorId: string | null;
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: number | null;
  snapshotAddress: string | null;
  description: string | null;
  resolutionSummary: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  timelineEntries: TimelineEntry[];
  booking?: {
    id: string;
    status: string;
    pickupAddress: string;
    customerId: string;
    driverProfileId: string | null;
  } | null;
}

export default function AdminSafetyIncidentDetailPage({
  params,
}: {
  params: Promise<{ incidentId: string }>;
}) {
  const { incidentId } = use(params);
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchIncident = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/safety/incidents/${incidentId}`);
      if (res.ok) {
        const data = await res.json();
        setIncident(data.incident);
      } else {
        showToast('Incident not found or unauthorized');
      }
    } catch {
      showToast('Error loading incident details');
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) {
        await fetchIncident();
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [fetchIncident]);

  const handleAction = async (action: string, toStatus?: string) => {
    try {
      const res = await fetch(`/api/admin/safety/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          toStatus,
          notes: notes || undefined,
          resolutionSummary: resolutionSummary || undefined,
        }),
      });

      if (res.ok) {
        showToast(`Safety incident updated with action: ${action}`);
        setNotes('');
        setResolutionSummary('');
        await fetchIncident();
      } else {
        const err = await res.json();
        showToast(err.error || 'Action failed');
      }
    } catch {
      showToast('Error executing action');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-outline">
        <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-12 text-center text-on-surface-variant">
        <p>Safety incident not found.</p>
        <Link
          href="/admin/sos-and-disputes"
          className="text-primary hover:underline mt-4 inline-block"
        >
          ← Back to Console
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Navigation back header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/sos-and-disputes"
          className="text-sm font-semibold text-on-surface-variant hover:text-white flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to SOS & Dispute Console
        </Link>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            incident.severity === 'CRITICAL'
              ? 'bg-error/20 text-on-error-container border border-error/50 animate-pulse'
              : 'bg-warning/20 text-on-warning-container border border-warning/40'
          }`}
        >
          {incident.severity} SEVERITY
        </span>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="bg-on-primary-container/80 border border-primary/50 text-primary px-4 py-3 rounded-xl text-sm">
          {toastMsg}
        </div>
      )}

      {/* Incident Summary Card */}
      <div className="bg-surface-container-low/80 border border-surface-container-high rounded-2xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
          <div>
            <div className="text-xs uppercase tracking-wider font-mono text-on-error-container font-semibold">
              Emergency Incident Record
            </div>
            <h1 className="text-2xl font-bold font-mono text-white flex items-center gap-3 mt-1">
              {incident.incidentNumber}
              <span className="bg-surface-container-high text-on-surface-variant text-xs px-3 py-1 rounded-full font-sans font-semibold">
                Status: {incident.status}
              </span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {incident.status === 'OPEN' && (
              <button
                onClick={() => handleAction('ACKNOWLEDGE')}
                className="px-4 py-2.5 bg-info hover:bg-info-hover text-white font-semibold rounded-xl text-sm transition"
              >
                Acknowledge Incident
              </button>
            )}
            {incident.status !== 'RESOLVED' && (
              <button
                onClick={() => handleAction('ESCALATE')}
                className="px-4 py-2.5 bg-suspend hover:bg-suspend-hover text-white font-semibold rounded-xl text-sm transition"
              >
                Escalate Incident
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="space-y-1">
            <span className="text-outline text-xs uppercase font-semibold">Incident Type</span>
            <p className="text-on-surface font-medium">{incident.type.replace(/_/g, ' ')}</p>
          </div>
          <div className="space-y-1">
            <span className="text-outline text-xs uppercase font-semibold">Reported At</span>
            <p className="text-on-surface font-mono text-xs">
              {new Date(incident.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-outline text-xs uppercase font-semibold">Related Booking</span>
            <p className="text-on-surface font-mono text-xs">{incident.bookingId ?? 'N/A'}</p>
          </div>
        </div>

        {/* Description */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high">
          <span className="text-outline text-xs uppercase font-semibold block mb-1">
            Submitted Description
          </span>
          <p className="text-on-surface-variant text-sm">
            {incident.description ?? 'No description supplied'}
          </p>
        </div>

        {/* Location Snapshot */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high space-y-2">
          <span className="text-outline text-xs uppercase font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-primary text-base">my_location</span>
            Authoritative Location Snapshot at Moment of SOS Trigger
          </span>
          {incident.latitude && incident.longitude ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-sm text-on-surface">
              <div>
                Coordinates: {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
                {incident.locationAccuracy && (
                  <span className="text-outline text-xs ml-2">
                    (±{incident.locationAccuracy.toFixed(1)}m accuracy)
                  </span>
                )}
              </div>
              {incident.snapshotAddress && (
                <div className="text-on-surface-variant text-xs truncate">
                  {incident.snapshotAddress}
                </div>
              )}
            </div>
          ) : (
            <p className="text-outline text-xs">
              No GPS telemetry snapshot available for this trigger.
            </p>
          )}
        </div>
      </div>

      {/* Operator Resolution Form */}
      {incident.status !== 'RESOLVED' && (
        <div className="bg-surface-container-low/80 border border-surface-container-high rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">check_circle</span>
            Operator Investigation & Resolution Control
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-on-surface-variant font-semibold block mb-1">
                Operator Notes
              </label>
              <input
                type="text"
                placeholder="Add notes for this operational state update..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs text-on-surface-variant font-semibold block mb-1">
                Resolution Summary
              </label>
              <textarea
                rows={2}
                placeholder="Summarize the resolution findings and outcome..."
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                onClick={() => handleAction('UPDATE_STATUS', 'INVESTIGATING')}
                className="px-4 py-2 bg-surface-container-high hover:bg-border text-on-surface font-semibold rounded-xl text-sm transition"
              >
                Mark Investigating
              </button>
              <button
                onClick={() => handleAction('RESOLVE')}
                className="px-5 py-2 bg-primary-container hover:bg-primary text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-900/40"
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Immutable Timeline */}
      <div className="bg-surface-container-low/80 border border-surface-container-high rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface-variant">history</span>
          Immutable Operational Timeline
        </h2>

        <div className="relative border-l-2 border-surface-container-high pl-6 ml-3 space-y-6">
          {incident.timelineEntries.map((entry) => (
            <div key={entry.id} className="relative">
              <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-primary border-4 border-surface-container-low" />
              <div className="text-xs font-mono text-outline">
                {new Date(entry.createdAt).toLocaleString()}
              </div>
              <div className="text-sm font-semibold text-on-surface mt-0.5">{entry.action}</div>
              {entry.notes && (
                <div className="text-xs text-on-surface-variant mt-1">{entry.notes}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
