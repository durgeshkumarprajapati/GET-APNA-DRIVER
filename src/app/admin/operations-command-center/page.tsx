'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin-layout';
import type {
  OperationsCommandSummary,
  OperationsDecision,
  OperationsActionDefinition,
} from '@/modules/operations';

export default function OperationsCommandCenterPage() {
  const [summary, setSummary] = useState<OperationsCommandSummary | null>(null);
  const [decisions, setDecisions] = useState<OperationsDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Action execution modal state
  const [selectedAction, setSelectedAction] = useState<{
    decisionId: string;
    action: OperationsActionDefinition;
  } | null>(null);
  const [executingAction, setExecutingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchOperationsData = useCallback(async () => {
    try {
      setError(null);
      const [summaryRes, decisionsRes] = await Promise.all([
        fetch('/api/admin/operations'),
        fetch(
          `/api/admin/operations/decisions?status=${statusFilter}&severity=${severityFilter}&type=${typeFilter}`,
        ),
      ]);

      if (!summaryRes.ok || !decisionsRes.ok) {
        throw new Error('Failed to load operational command data');
      }

      const summaryData = await summaryRes.json();
      const decisionsData = await decisionsRes.json();

      setSummary(summaryData.data ?? summaryData.summary);
      setDecisions(decisionsData.data ?? decisionsData.decisions ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading operations command center');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, typeFilter]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [summaryRes, decisionsRes] = await Promise.all([
          fetch('/api/admin/operations'),
          fetch(
            `/api/admin/operations/decisions?status=${statusFilter}&severity=${severityFilter}&type=${typeFilter}`,
          ),
        ]);

        if (!summaryRes.ok || !decisionsRes.ok) {
          throw new Error('Failed to load operational command data');
        }

        const summaryData = await summaryRes.json();
        const decisionsData = await decisionsRes.json();

        if (active) {
          setSummary(summaryData.data ?? summaryData.summary);
          setDecisions(decisionsData.data ?? decisionsData.decisions ?? []);
          setError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Error loading operations command center');
          setLoading(false);
        }
      }
    };

    void load();
    const interval = setInterval(() => {
      void load();
    }, 15000); // 15s auto refresh
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [statusFilter, severityFilter, typeFilter]);

  const handleAcknowledge = async (decisionId: string) => {
    try {
      const res = await fetch(`/api/admin/operations/decisions/${decisionId}/acknowledge`, {
        method: 'POST',
      });
      if (res.ok) {
        void fetchOperationsData();
      }
    } catch {
      // Handled silently
    }
  };

  const handleDismiss = async (decisionId: string) => {
    try {
      const res = await fetch(`/api/admin/operations/decisions/${decisionId}/dismiss`, {
        method: 'POST',
      });
      if (res.ok) {
        void fetchOperationsData();
      }
    } catch {
      // Handled silently
    }
  };

  const handleExecuteAction = async () => {
    if (!selectedAction) return;
    setExecutingAction(true);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/admin/operations/actions/${selectedAction.action.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionId: selectedAction.decisionId,
          actionType: selectedAction.action.type,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Action execution failed');
      }
      setActionSuccess(`Action ${selectedAction.action.label} executed successfully.`);
      setTimeout(() => {
        setSelectedAction(null);
        setActionSuccess(null);
        void fetchOperationsData();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to execute action');
    } finally {
      setExecutingAction(false);
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-[#3b0909] text-[#ff8e8e] border-[#93000a]';
      case 'HIGH':
        return 'bg-[#3a2000] text-[#ffb957] border-[#7d4e00]';
      case 'MEDIUM':
        return 'bg-[#2a2900] text-[#ffe662] border-[#6b6700]';
      default:
        return 'bg-[#0f2438] text-[#82cfff] border-[#004a77]';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'DETECTED':
      case 'ACTIVE':
      case 'ACTION_PENDING':
        return 'bg-[#25a475]/20 text-[#68dba9] border-[#25a475]';
      case 'ACKNOWLEDGED':
        return 'bg-[#00344d] text-[#70d2ff] border-[#004d73]';
      case 'RESOLVED':
        return 'bg-[#1b2b00] text-[#a4f542] border-[#3f6300]';
      case 'DISMISSED':
        return 'bg-[#222630] text-[#87948b] border-[#363b47]';
      default:
        return 'bg-[#181c24] text-[#dfe2ee] border-[#262a33]';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Title Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#262a33] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#68dba9] text-2xl">terminal</span>
              <h1 className="text-2xl font-bold text-[#dfe2ee] tracking-tight font-['Space_Grotesk']">
                Operations Command & Decision Engine
              </h1>
            </div>
            <p className="text-xs text-[#87948b] mt-1 font-mono">
              Real-time cross-domain orchestration, deterministic decision evaluation & action
              dispatch
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/experience-orchestration"
              className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] hover:border-[#68dba9] text-[#68dba9] text-xs font-mono flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-sm">psychology</span>
              Experience Engine
            </Link>
            <Link
              href="/admin/risk-and-trust"
              className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] hover:border-[#68dba9] text-[#68dba9] text-xs font-mono flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-sm">shield</span>
              Risk & Trust Console
            </Link>
            <button
              onClick={() => void fetchOperationsData()}
              className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] hover:border-[#68dba9] text-[#dfe2ee] text-xs font-mono flex items-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Refresh Signals
            </button>
            <div className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] flex items-center gap-2 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-[#68dba9] animate-ping" />
              <span className="text-[#68dba9] font-bold">ORCHESTRATOR ONLINE</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-[#3b0909] border border-[#93000a] text-[#ff8e8e] text-xs font-mono flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-xs underline ml-4">
              Dismiss
            </button>
          </div>
        )}

        {/* Top Metrics Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col justify-between">
              <span className="text-[10px] font-mono text-[#87948b] uppercase tracking-wider">
                System Status
              </span>
              <div className="text-sm font-bold font-mono text-[#68dba9] mt-2">
                {summary.systemStatus}
              </div>
              <span className="text-[10px] text-[#87948b] mt-1">
                Health Score: {summary.platformHealthScore}/100
              </span>
            </div>

            <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col justify-between">
              <span className="text-[10px] font-mono text-[#87948b] uppercase tracking-wider">
                Active Decisions
              </span>
              <div className="text-2xl font-bold font-['Space_Grotesk'] text-[#dfe2ee] mt-1">
                {summary.activeDecisionsCount}
              </div>
              <span className="text-[10px] text-[#87948b] mt-1">Evaluated Real-Time</span>
            </div>

            <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col justify-between">
              <span className="text-[10px] font-mono text-[#87948b] uppercase tracking-wider">
                Critical / High
              </span>
              <div className="text-2xl font-bold font-['Space_Grotesk'] text-[#ff8e8e] mt-1">
                {summary.criticalCount + summary.highCount}
              </div>
              <span className="text-[10px] text-[#87948b] mt-1">Requires Operator Action</span>
            </div>

            <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col justify-between">
              <span className="text-[10px] font-mono text-[#87948b] uppercase tracking-wider">
                Searching Bookings
              </span>
              <div className="text-2xl font-bold font-['Space_Grotesk'] text-[#68dba9] mt-1">
                {summary.searchingBookingsCount}
              </div>
              <span className="text-[10px] text-[#87948b] mt-1">
                Available Drivers: {summary.availableDriversCount}
              </span>
            </div>

            <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col justify-between">
              <span className="text-[10px] font-mono text-[#87948b] uppercase tracking-wider">
                Active Trips
              </span>
              <div className="text-2xl font-bold font-['Space_Grotesk'] text-[#70d2ff] mt-1">
                {summary.activeTripsCount}
              </div>
              <span className="text-[10px] text-[#87948b] mt-1">On-trip fleet</span>
            </div>

            <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col justify-between">
              <span className="text-[10px] font-mono text-[#87948b] uppercase tracking-wider">
                Safety Incidents
              </span>
              <div className="text-2xl font-bold font-['Space_Grotesk'] text-[#ffb957] mt-1">
                {summary.activeSafetyIncidentsCount}
              </div>
              <span className="text-[10px] text-[#87948b] mt-1">
                Open Support: {summary.openSupportTicketsCount}
              </span>
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#87948b]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0f131c] border border-[#262a33] rounded-lg px-3 py-1.5 text-xs font-mono text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
            >
              <option value="ALL">All Statuses</option>
              <option value="DETECTED">Detected</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="RESOLVED">Resolved</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#87948b]">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-[#0f131c] border border-[#262a33] rounded-lg px-3 py-1.5 text-xs font-mono text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#87948b]">Decision Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#0f131c] border border-[#262a33] rounded-lg px-3 py-1.5 text-xs font-mono text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
            >
              <option value="ALL">All Types</option>
              <option value="SAFETY_PRESSURE">Safety Pressure</option>
              <option value="DRIVER_SHORTAGE">Driver Shortage</option>
              <option value="TRIP_RELIABILITY_PRESSURE">Trip Reliability Pressure</option>
              <option value="SCHEDULED_RIDE_RISK">Scheduled Ride Risk</option>
              <option value="SUPPORT_BACKLOG">Support Backlog</option>
              <option value="PLATFORM_DEGRADATION">Platform Degradation</option>
            </select>
          </div>

          <div className="ml-auto text-xs font-mono text-[#87948b]">
            Showing <span className="text-[#dfe2ee] font-bold">{decisions.length}</span> decision
            records
          </div>
        </div>

        {/* Decision Records Feed */}
        {loading ? (
          <div className="bg-[#181c24] p-12 rounded-xl border border-[#262a33] text-center text-xs font-mono text-[#87948b]">
            Evaluating operational decisions across network domains...
          </div>
        ) : decisions.length === 0 ? (
          <div className="bg-[#181c24] p-12 rounded-xl border border-[#262a33] text-center space-y-2">
            <span className="material-symbols-outlined text-3xl text-[#68dba9]">check_circle</span>
            <p className="text-sm font-bold text-[#dfe2ee]">No decisions match selected criteria</p>
            <p className="text-xs text-[#87948b] font-mono">
              System is operating within nominal baseline parameters.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {decisions.map((decision) => (
              <div
                key={decision.id}
                className="bg-[#181c24] rounded-xl border border-[#262a33] p-5 hover:border-[#363b47] transition-all space-y-4"
              >
                {/* Decision Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#262a33] pb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getSeverityBadgeClass(
                        decision.severity,
                      )}`}
                    >
                      {decision.severity}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getStatusBadgeClass(
                        decision.status,
                      )}`}
                    >
                      {decision.status}
                    </span>
                    <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                      {decision.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-[#87948b]">
                    <span>
                      Zone:{' '}
                      <strong className="text-[#dfe2ee]">{decision.zoneId ?? 'SYSTEM'}</strong>
                    </span>
                    <span>
                      Confidence: <strong className="text-[#68dba9]">{decision.confidence}</strong>
                    </span>
                    <span>Evaluated: {new Date(decision.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Explanation & Evidence */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="lg:col-span-2 space-y-2">
                    <p className="text-[#bccac0]">{decision.summary || decision.why}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {decision.evidence.map((ev, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded bg-[#0f131c] border border-[#262a33] text-[11px] text-[#87948b]"
                        >
                          <strong className="text-[#dfe2ee]">{ev.label || ev.key}:</strong>{' '}
                          {String(ev.value)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions & Dispatch Options */}
                  <div className="bg-[#0f131c] p-3 rounded-lg border border-[#262a33] flex flex-col justify-between space-y-3">
                    <div className="text-[11px] text-[#87948b]">
                      <span className="text-[#dfe2ee] font-bold block mb-1">
                        Recommended Action
                      </span>
                      {decision.recommendedActions[0]?.label ?? 'No automated action needed'}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#262a33]">
                      <Link
                        href={`/admin/operations-command-center/decisions/${decision.id}`}
                        className="px-3 py-1.5 rounded-lg bg-[#262a33] hover:bg-[#363b47] text-[#dfe2ee] text-xs font-mono transition-colors"
                      >
                        Inspect Evidence
                      </Link>

                      {decision.status === 'DETECTED' && (
                        <>
                          <button
                            onClick={() => handleAcknowledge(decision.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#00344d] hover:bg-[#004d73] text-[#70d2ff] border border-[#004d73] text-xs font-mono transition-colors"
                          >
                            Acknowledge
                          </button>
                          <button
                            onClick={() => handleDismiss(decision.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#181c24] hover:bg-[#222630] text-[#87948b] border border-[#262a33] text-xs font-mono transition-colors"
                          >
                            Dismiss
                          </button>
                        </>
                      )}

                      {decision.recommendedActions.length > 0 && decision.status !== 'RESOLVED' && (
                        <button
                          onClick={() => {
                            const act = decision.recommendedActions[0];
                            setSelectedAction({
                              decisionId: decision.id,
                              action: act,
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#25a475] hover:bg-[#1f8760] text-[#00311f] font-bold text-xs font-mono transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">bolt</span>
                          Execute Action
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Confirmation Modal */}
        {selectedAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="bg-[#181c24] border border-[#262a33] rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ffb957] text-xl">warning</span>
                  <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    Confirm Operational Action Dispatch
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedAction(null)}
                  className="text-[#87948b] hover:text-[#dfe2ee] text-sm font-mono"
                >
                  ✕
                </button>
              </div>

              {actionSuccess ? (
                <div className="p-4 rounded-lg bg-[#1b2b00] border border-[#3f6300] text-[#a4f542] text-xs font-mono flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>{actionSuccess}</span>
                </div>
              ) : (
                <>
                  <div className="space-y-3 text-xs font-mono">
                    <p className="text-[#dfe2ee] font-bold">{selectedAction.action.label}</p>
                    <p className="text-[#bccac0]">{selectedAction.action.impactSummary}</p>

                    <div className="bg-[#0f131c] p-3 rounded-lg border border-[#262a33] space-y-2">
                      <span className="text-[10px] text-[#87948b] uppercase tracking-wider block">
                        Action Type & Lock Guard
                      </span>
                      <div className="text-[#68dba9] font-bold">{selectedAction.action.type}</div>
                      <div className="text-[11px] text-[#87948b]">
                        Guarded by Redis Distributed Lock (`lock:action:${selectedAction.action.id}
                        `)
                      </div>
                    </div>

                    {selectedAction.action.params && (
                      <div className="bg-[#0f131c] p-3 rounded-lg border border-[#262a33] space-y-2">
                        <span className="text-[10px] text-[#87948b] uppercase tracking-wider block">
                          Execution Parameters
                        </span>
                        <pre className="text-[11px] text-[#dfe2ee] overflow-x-auto">
                          {JSON.stringify(selectedAction.action.params, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262a33]">
                    <button
                      onClick={() => setSelectedAction(null)}
                      disabled={executingAction}
                      className="px-4 py-2 rounded-lg bg-[#0f131c] border border-[#262a33] text-[#dfe2ee] text-xs font-mono hover:bg-[#262a33]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExecuteAction}
                      disabled={executingAction}
                      className="px-4 py-2 rounded-lg bg-[#25a475] hover:bg-[#1f8760] text-[#00311f] font-bold text-xs font-mono flex items-center gap-2 disabled:opacity-50"
                    >
                      {executingAction ? (
                        <>
                          <span className="w-3 h-3 border-2 border-[#00311f] border-t-transparent rounded-full animate-spin" />
                          Acquiring Lock & Executing...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">bolt</span>
                          Authorize & Execute
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
