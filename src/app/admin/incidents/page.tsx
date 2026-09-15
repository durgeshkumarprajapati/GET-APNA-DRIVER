'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ControlStationLayout } from '@/components/control-station-layout';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';

interface IncidentItem {
  id: string;
  incidentNumber: string;
  bookingId: string;
  type: string;
  severity: string;
  status: string;
  confidence: string;
  detectedAt: string;
  booking: {
    id: string;
    status: string;
    pickupAddress: string;
    dropoffAddress?: string | null;
  };
  customer?: { id: string } | null;
  driverProfile?: { id: string; userId: string } | null;
}

interface IncidentsMetrics {
  totalActive: number;
  totalCritical: number;
  totalRecovering: number;
  totalEscalated: number;
  totalResolvedToday: number;
}

const SEVERITY_TONE: Record<string, StatusBadgeTone> = {
  CRITICAL: 'danger',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'neutral',
};

const STATUS_TONE: Record<string, StatusBadgeTone> = {
  DETECTED: 'warning',
  INVESTIGATING: 'warning',
  CONFIRMED: 'warning',
  RECOVERING: 'info',
  RESOLVED: 'success',
  ESCALATED: 'danger',
  CLOSED: 'neutral',
  DISMISSED: 'neutral',
};

export default function AdminIncidentsListPage() {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [metrics, setMetrics] = useState<IncidentsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');

  const fetchIncidents = useCallback(async () => {
    const query = new URLSearchParams();
    if (statusFilter) query.set('status', statusFilter);
    if (severityFilter) query.set('severity', severityFilter);

    try {
      const res = await fetch(`/api/admin/incidents?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to load incidents');
      const resData = await res.json();
      setIncidents(resData.incidents || []);
      setMetrics(resData.metrics || null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load incidents';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      if (!ignore) {
        await fetchIncidents();
      }
    }
    void init();
    return () => {
      ignore = true;
    };
  }, [fetchIncidents]);

  return (
    <ControlStationLayout activePersona="admin">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Trip Reliability Incident Management</h1>
            <p className="text-xs text-slate-400 mt-1">Real-time operational anomaly tracking and automated recovery control.</p>
          </div>
          <Link
            href="/admin/live-ops-console"
            className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
          >
            ← Live Ops Console
          </Link>
        </div>

        {/* Metrics Grid */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Active Anomaly Cases</span>
              <p className="text-2xl font-extrabold text-amber-400 mt-1">{metrics.totalActive}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Critical Severity</span>
              <p className="text-2xl font-extrabold text-rose-400 mt-1">{metrics.totalCritical}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400">In Active Recovery</span>
              <p className="text-2xl font-extrabold text-sky-400 mt-1">{metrics.totalRecovering}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Human Escalations</span>
              <p className="text-2xl font-extrabold text-purple-400 mt-1">{metrics.totalEscalated}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Resolved Today</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">{metrics.totalResolvedToday}</p>
            </div>
          </div>
        )}

        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs font-bold text-slate-300">Filter Incidents:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="DETECTED">Detected</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RECOVERING">Recovering</option>
            <option value="ESCALATED">Escalated</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState message="Fetching active trip reliability incidents..." />
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm">{error}</div>
        ) : incidents.length === 0 ? (
          <EmptyState
            icon="done_all"
            message="All active rides and system operations are functioning normally within reliability parameters."
          />
        ) : (
          <div className="space-y-3">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">{incident.incidentNumber}</span>
                    <StatusBadge label={incident.severity} tone={SEVERITY_TONE[incident.severity] || 'neutral'} />
                    <StatusBadge label={incident.status} tone={STATUS_TONE[incident.status] || 'neutral'} />
                  </div>
                  <p className="text-xs text-slate-300">
                    Incident Type: <strong className="text-slate-100">{incident.type}</strong> • Booking #{incident.bookingId}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Detected: {new Date(incident.detectedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/incidents/${incident.id}`}
                    className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-colors"
                  >
                    View Control Case →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ControlStationLayout>
  );
}
