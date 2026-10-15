'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';

interface SafetyIncidentItem {
  id: string;
  incidentNumber: string;
  type: string;
  severity: string;
  status: string;
  bookingId: string | null;
  reporterUserId: string;
  customerId: string | null;
  latitude: number | null;
  longitude: number | null;
  snapshotAddress: string | null;
  createdAt: string;
  timelineEntries: Array<{ id: string; action: string; createdAt: string }>;
}

interface DisputeItem {
  id: string;
  disputeNumber: string;
  bookingId: string;
  raisedByUserId: string;
  category: string;
  status: string;
  reason: string;
  refundAmountMinorUnits: number | null;
  resolutionSummary: string | null;
  createdAt: string;
}

export default function AdminSosAndDisputesPage() {
  const [activeTab, setActiveTab] = useState<'SOS' | 'DISPUTES'>('SOS');
  const [incidents, setIncidents] = useState<SafetyIncidentItem[]>([]);
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'SOS') {
        const query = new URLSearchParams();
        if (statusFilter !== 'ALL') query.set('status', statusFilter);
        if (search) query.set('search', search);

        const res = await fetch(`/api/admin/safety/incidents?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setIncidents(data.items ?? []);
        }
      } else {
        const query = new URLSearchParams();
        if (statusFilter !== 'ALL') query.set('status', statusFilter);
        if (search) query.set('search', search);

        const res = await fetch(`/api/admin/disputes?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setDisputes(data.items ?? []);
        }
      }
    } catch {
      showToast('Failed to load records from backend');
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, search]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) {
        await fetchData();
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [fetchData]);

  const handleIncidentAction = async (incidentId: string, action: string) => {
    try {
      const res = await fetch(`/api/admin/safety/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        showToast(`Incident action '${action}' completed successfully`);
        await fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Action failed');
      }
    } catch {
      showToast('Error performing action');
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-error/20 text-on-error-container border border-error/40 animate-pulse';
      case 'HIGH':
        return 'bg-warning/20 text-on-warning-container border border-warning/30';
      case 'MEDIUM':
        return 'bg-warning/20 text-on-warning-container border border-warning/30';
      default:
        return 'bg-primary/20 text-primary border border-primary/30';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-error/20 text-on-error-container';
      case 'ACKNOWLEDGED':
        return 'bg-info/20 text-on-info-container';
      case 'INVESTIGATING':
      case 'UNDER_REVIEW':
        return 'bg-warning/20 text-on-warning-container';
      case 'ESCALATED':
        return 'bg-suspend/20 text-on-suspend-container';
      case 'RESOLVED':
        return 'bg-primary/20 text-primary';
      case 'CANCELLED':
        return 'bg-outline/20 text-on-surface-variant';
      default:
        return 'bg-outline/20 text-on-surface-variant';
    }
  };

  const criticalOpenCount = incidents.filter(
    (i) => i.severity === 'CRITICAL' && i.status === 'OPEN',
  ).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-3xl">emergency</span>
            SOS Safety & Dispute Resolution Console
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Real-time emergency incident monitoring, response dispatch, and booking dispute center.
          </p>
        </div>

        {criticalOpenCount > 0 && (
          <div className="flex items-center gap-3 bg-error-container/60 border border-error/50 rounded-xl px-4 py-2 text-on-error-container animate-pulse">
            <span className="material-symbols-outlined text-on-error-container text-2xl">
              warning
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-on-error-container">
                Critical SOS Alerts
              </div>
              <div className="text-sm font-bold">{criticalOpenCount} Unacknowledged Emergency</div>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="bg-on-primary-container/80 border border-primary/50 text-primary px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="text-primary hover:text-primary">
            ✕
          </button>
        </div>
      )}

      {/* Console Navigation Tabs & Filter Bar */}
      <div className="bg-surface-container-low/60 border border-surface-container-high rounded-2xl p-4 space-y-4 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-surface-container-high pb-4">
          <div className="flex flex-wrap items-center gap-2 bg-surface-container-lowest p-1.5 rounded-xl border border-surface-container-high">
            <button
              onClick={() => {
                setActiveTab('SOS');
                setStatusFilter('ALL');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'SOS'
                  ? 'bg-error text-white shadow-lg shadow-red-900/30'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-lg">sos</span>
              SOS Incidents
              {incidents.length > 0 && (
                <span className="bg-error-container text-on-error-container text-xs px-2 py-0.5 rounded-full border border-error/30">
                  {incidents.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('DISPUTES');
                setStatusFilter('ALL');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'DISPUTES'
                  ? 'bg-primary-container text-white shadow-lg shadow-emerald-900/30'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-lg">gavel</span>
              Booking Disputes
              {disputes.length > 0 && (
                <span className="bg-on-primary-container text-primary text-xs px-2 py-0.5 rounded-full border border-primary/30">
                  {disputes.length}
                </span>
              )}
            </button>
          </div>

          {/* Filter controls */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Search reference or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface-container-lowest border border-surface-container-high rounded-xl pl-9 pr-4 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-container-lowest border border-surface-container-high rounded-xl px-3 py-2 text-sm text-on-surface-variant focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            <button
              onClick={fetchData}
              className="p-2 bg-surface-container-lowest border border-surface-container-high text-on-surface-variant hover:text-white rounded-xl transition"
              title="Refresh queue"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
            </button>
          </div>
        </div>

        {/* Table Container */}
        {loading ? (
          <div className="p-12 text-center text-outline flex items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin text-2xl">
              progress_activity
            </span>
            Loading database records...
          </div>
        ) : activeTab === 'SOS' ? (
          incidents.length === 0 ? (
            <div className="p-12 text-center text-outline">
              <span className="material-symbols-outlined text-4xl block mb-2 text-outline">
                shield
              </span>
              No safety incidents matched the selected query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-surface-container-high text-on-surface-variant font-semibold bg-surface-container-lowest/40">
                    <th className="py-3 px-4">Incident Ref</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Location Snapshot</th>
                    <th className="py-3 px-4">Reported</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high/60">
                  {incidents.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-container-high/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-on-surface">
                        <Link
                          href={`/admin/sos-and-disputes/${item.id}`}
                          className="hover:text-primary underline decoration-primary/40"
                        >
                          {item.incidentNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${getSeverityBadgeClass(
                            item.severity,
                          )}`}
                        >
                          {item.severity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                            item.status,
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-on-surface-variant font-medium">
                        {item.type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3.5 px-4 text-on-surface-variant text-xs">
                        {item.latitude && item.longitude ? (
                          <span className="flex items-center gap-1 font-mono text-on-surface-variant">
                            <span className="material-symbols-outlined text-primary text-sm">
                              location_on
                            </span>
                            {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-outline">No telemetry</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-on-surface-variant text-xs">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {item.status === 'OPEN' && (
                          <button
                            onClick={() => handleIncidentAction(item.id, 'ACKNOWLEDGE')}
                            className="px-3 py-1 bg-info/30 hover:bg-info/50 text-on-info-container border border-info/40 rounded-lg text-xs font-semibold transition"
                          >
                            Acknowledge
                          </button>
                        )}
                        {item.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleIncidentAction(item.id, 'ESCALATE')}
                            className="px-3 py-1 bg-suspend/30 hover:bg-suspend/50 text-on-suspend-container border border-suspend/40 rounded-lg text-xs font-semibold transition"
                          >
                            Escalate
                          </button>
                        )}
                        <Link
                          href={`/admin/sos-and-disputes/${item.id}`}
                          className="px-3 py-1 bg-surface-container-high hover:bg-border text-on-surface rounded-lg text-xs font-semibold transition inline-block"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : disputes.length === 0 ? (
          <EmptyState icon="gavel" message="No booking disputes found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-surface-container-high text-on-surface-variant font-semibold bg-surface-container-lowest/40">
                  <th className="py-3 px-4">Dispute Ref</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Refund Amount</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/60">
                {disputes.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-high/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-on-surface">
                      <Link
                        href={`/admin/disputes/${item.id}`}
                        className="hover:text-primary underline decoration-primary/40"
                      >
                        {item.disputeNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-on-surface-variant">
                      {item.category.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                          item.status,
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-on-surface-variant max-w-xs truncate">
                      {item.reason}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-primary font-semibold">
                      {item.refundAmountMinorUnits
                        ? `₹${(item.refundAmountMinorUnits / 100).toFixed(2)}`
                        : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-on-surface-variant text-xs">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Link
                        href={`/admin/disputes/${item.id}`}
                        className="px-3 py-1 bg-primary-container/30 hover:bg-primary-container/50 text-primary border border-primary/40 rounded-lg text-xs font-semibold transition inline-block"
                      >
                        Resolve / Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
