'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin-layout';

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
        return 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-red-500/20 text-red-400';
      case 'ACKNOWLEDGED':
        return 'bg-blue-500/20 text-blue-400';
      case 'INVESTIGATING':
      case 'UNDER_REVIEW':
        return 'bg-amber-500/20 text-amber-400';
      case 'ESCALATED':
        return 'bg-purple-500/20 text-purple-400';
      case 'RESOLVED':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'CANCELLED':
        return 'bg-slate-500/20 text-slate-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  const criticalOpenCount = incidents.filter(
    (i) => i.severity === 'CRITICAL' && i.status === 'OPEN',
  ).length;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-3xl">emergency</span>
              SOS Safety & Dispute Resolution Console
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Real-time emergency incident monitoring, response dispatch, and booking dispute
              center.
            </p>
          </div>

          {criticalOpenCount > 0 && (
            <div className="flex items-center gap-3 bg-red-950/60 border border-red-500/50 rounded-xl px-4 py-2 text-red-200 animate-pulse">
              <span className="material-symbols-outlined text-red-400 text-2xl">warning</span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-red-400">
                  Critical SOS Alerts
                </div>
                <div className="text-sm font-bold">
                  {criticalOpenCount} Unacknowledged Emergency
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
            <span>{toastMsg}</span>
            <button
              onClick={() => setToastMsg(null)}
              className="text-emerald-400 hover:text-emerald-200"
            >
              ✕
            </button>
          </div>
        )}

        {/* Console Navigation Tabs & Filter Bar */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setActiveTab('SOS');
                  setStatusFilter('ALL');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'SOS'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-lg">sos</span>
                SOS Incidents
                {incidents.length > 0 && (
                  <span className="bg-red-950 text-red-300 text-xs px-2 py-0.5 rounded-full border border-red-500/30">
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
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-lg">gavel</span>
                Booking Disputes
                {disputes.length > 0 && (
                  <span className="bg-emerald-950 text-emerald-300 text-xs px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {disputes.length}
                  </span>
                )}
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-lg">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search reference or keywords..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
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
                className="p-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition"
                title="Refresh queue"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin text-2xl">
                progress_activity
              </span>
              Loading database records...
            </div>
          ) : activeTab === 'SOS' ? (
            incidents.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <span className="material-symbols-outlined text-4xl block mb-2 text-slate-600">
                  shield
                </span>
                No safety incidents matched the selected query.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                      <th className="py-3 px-4">Incident Ref</th>
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Location Snapshot</th>
                      <th className="py-3 px-4">Reported</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {incidents.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                          <Link
                            href={`/admin/sos-and-disputes/${item.id}`}
                            className="hover:text-emerald-400 underline decoration-emerald-500/40"
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
                        <td className="py-3.5 px-4 text-slate-300 font-medium">
                          {item.type.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-xs">
                          {item.latitude && item.longitude ? (
                            <span className="flex items-center gap-1 font-mono text-slate-300">
                              <span className="material-symbols-outlined text-emerald-400 text-sm">
                                location_on
                              </span>
                              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-slate-600">No telemetry</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-xs">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {item.status === 'OPEN' && (
                            <button
                              onClick={() => handleIncidentAction(item.id, 'ACKNOWLEDGE')}
                              className="px-3 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-semibold transition"
                            >
                              Acknowledge
                            </button>
                          )}
                          {item.status !== 'RESOLVED' && (
                            <button
                              onClick={() => handleIncidentAction(item.id, 'ESCALATE')}
                              className="px-3 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-semibold transition"
                            >
                              Escalate
                            </button>
                          )}
                          <Link
                            href={`/admin/sos-and-disputes/${item.id}`}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition inline-block"
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
            <div className="p-12 text-center text-slate-500">
              <span className="material-symbols-outlined text-4xl block mb-2 text-slate-600">
                gavel
              </span>
              No booking disputes found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                    <th className="py-3 px-4">Dispute Ref</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Refund Amount</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {disputes.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                        <Link
                          href={`/admin/disputes/${item.id}`}
                          className="hover:text-emerald-400 underline decoration-emerald-500/40"
                        >
                          {item.disputeNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-300">
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
                      <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                        {item.reason}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400 font-semibold">
                        {item.refundAmountMinorUnits
                          ? `₹${(item.refundAmountMinorUnits / 100).toFixed(2)}`
                          : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-xs">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <Link
                          href={`/admin/disputes/${item.id}`}
                          className="px-3 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition inline-block"
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
    </AdminLayout>
  );
}
