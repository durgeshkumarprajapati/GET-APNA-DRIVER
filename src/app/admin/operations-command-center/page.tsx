'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ControlStationLayout } from '@/components/control-station-layout';

import type {
  OperationsCommandSummary,
  OperationsDecision,
  OperationsActionDefinition,
} from '@/modules/operations';

interface ReliabilityIntelligenceData {
  timeframeDays: number;
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  escalatedIncidents: number;
  dismissedIncidents: number;
  recoverySuccessRate: number;
  avgResolutionTimeMinutes: number;
  recurringIncidents: Array<{
    type: string;
    count: number;
    percentage: number;
    avgResolutionMinutes: number;
  }>;
  failedRecoveryTrends: Array<{
    failureCode: string;
    count: number;
    lastOccurredAt: string | null;
  }>;
  recoveryAttemptsSummary: {
    total: number;
    succeeded: number;
    failed: number;
    processing: number;
    cancelled: number;
  };
  dispatchPressure: {
    searchingBookingsCount: number;
    delayedBookingsCount: number;
    availableDriversCount: number;
    activeTripsCount: number;
    pressureRatio: number;
  };
}

interface IncidentItem {
  id: string;
  incidentNumber: string;
  bookingId: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: string;
  confidence: string;
  detectedAt: string;
  resolvedAt?: string | null;
  booking: {
    id: string;
    status: string;
    pickupAddress: string;
    dropoffAddress?: string | null;
  };
  customer?: { id: string } | null;
  driverProfile?: { id: string; userId: string } | null;
}

interface IncidentDetail extends IncidentItem {
  fingerprint: string;
  metadata?: Record<string, unknown> | null;
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
    attemptNumber: number;
    action: string;
    status: string;
    idempotencyKey: string;
    triggeredBy: string;
    failureCode?: string | null;
    failureSummary?: string | null;
    completedAt?: string | null;
  }>;
}

const DEFAULT_SUMMARY: OperationsCommandSummary = {
  activeDecisionsCount: 0,
  criticalCount: 0,
  highCount: 0,
  searchingBookingsCount: 0,
  availableDriversCount: 0,
  activeTripsCount: 0,
  activeSafetyIncidentsCount: 0,
  openSupportTicketsCount: 0,
  platformHealthScore: 100,
  systemStatus: 'HEALTHY',
  decisions: [],
  updatedSecondsAgo: 0,
};

export default function UnifiedOperationsCommandCenterPage() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'incidents' | 'reliability' | 'actions'
  >('overview');

  // Core Data States
  const [summary, setSummary] = useState<OperationsCommandSummary>(DEFAULT_SUMMARY);
  const [decisions, setDecisions] = useState<OperationsDecision[]>([]);
  const [intelligence, setIntelligence] = useState<ReliabilityIntelligenceData | null>(null);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);

  // Telemetry & Real-Time Connection
  const [sseConnected, setSseConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination for Incidents
  const [incidentStatusFilter, setIncidentStatusFilter] = useState<string>('');
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState<string>('');
  const [incidentSearchQuery, setIncidentSearchQuery] = useState<string>('');
  const [incidentPage, setIncidentPage] = useState(1);
  const [incidentTotalPages, setIncidentTotalPages] = useState(1);

  // Filters for Decisions
  const [decisionSeverityFilter, setDecisionSeverityFilter] = useState<string>('ALL');

  // Drawer / Modal States
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedIncidentDetail, setSelectedIncidentDetail] = useState<IncidentDetail | null>(null);
  const [loadingDrawer, setLoadingDrawer] = useState(false);

  // Action Modals
  const [selectedDecisionAction, setSelectedDecisionAction] = useState<{
    decisionId: string;
    action: OperationsActionDefinition;
  } | null>(null);
  const [executingAction, setExecutingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Incident Manual Action States
  const [actionModal, setActionModal] = useState<{
    type: 'RECOVER' | 'RESOLVE' | 'DISMISS';
    incidentId: string;
  } | null>(null);
  const [actionInputReason, setActionInputReason] = useState('');
  const [submittingIncidentAction, setSubmittingIncidentAction] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch Operations Summary & Intelligence Data
  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, decisionsRes, intelligenceRes] = await Promise.all([
        fetch('/api/admin/operations'),
        fetch(`/api/admin/operations/decisions?severity=${decisionSeverityFilter}`),
        fetch('/api/admin/operations/reliability-intelligence?days=7'),
      ]);

      if (summaryRes.ok) {
        const sData = await summaryRes.json();
        setSummary(sData.data ?? sData.summary ?? DEFAULT_SUMMARY);
      }
      if (decisionsRes.ok) {
        const dData = await decisionsRes.json();
        setDecisions(dData.data ?? dData.decisions ?? []);
      }
      if (intelligenceRes.ok) {
        const iData = await intelligenceRes.json();
        setIntelligence(iData.data ?? null);
      }

      setLastSyncTime(new Date());
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching operational data');
    } finally {
      setLoading(false);
    }
  }, [decisionSeverityFilter]);

  // Fetch Incidents List
  const fetchIncidents = useCallback(async () => {
    const params = new URLSearchParams();
    if (incidentStatusFilter) params.set('status', incidentStatusFilter);
    if (incidentSeverityFilter) params.set('severity', incidentSeverityFilter);
    params.set('page', String(incidentPage));
    params.set('limit', '15');

    try {
      const res = await fetch(`/api/admin/incidents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
        if (data.pagination) {
          setIncidentTotalPages(data.pagination.totalPages || 1);
        }
      }
    } catch {
      // Handled silently
    }
  }, [incidentStatusFilter, incidentSeverityFilter, incidentPage]);

  // Fetch Single Incident Details for Drawer
  const fetchIncidentDetail = useCallback(async (id: string) => {
    setLoadingDrawer(true);
    try {
      const res = await fetch(`/api/admin/incidents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedIncidentDetail(data.data ?? null);
      }
    } catch {
      // Handled silently
    } finally {
      setLoadingDrawer(false);
    }
  }, []);

  useEffect(() => {
    if (selectedIncidentId) {
      void fetchIncidentDetail(selectedIncidentId);
    }
  }, [selectedIncidentId, fetchIncidentDetail]);

  // Load Initial Data & Polling Fallback + SSE Stream setup
  useEffect(() => {
    void fetchData();
    void fetchIncidents();

    // Setup SSE Stream
    try {
      const es = new EventSource('/api/admin/operations/stream');
      eventSourceRef.current = es;

      es.onopen = () => {
        setSseConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.summary) setSummary(payload.summary);
          if (payload.intelligence) setIntelligence(payload.intelligence);
          setLastSyncTime(new Date());
        } catch {
          // Parse error silent fallback
        }
      };

      es.onerror = () => {
        setSseConnected(false);
        es.close();
      };
    } catch {
      setSseConnected(false);
    }

    // 15-second polling fallback
    const interval = setInterval(() => {
      void fetchData();
      void fetchIncidents();
    }, 15000);

    return () => {
      clearInterval(interval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [fetchData, fetchIncidents]);

  // Decision Action Handlers
  const handleAcknowledgeDecision = async (decisionId: string) => {
    try {
      const res = await fetch(`/api/admin/operations/decisions/${decisionId}/acknowledge`, {
        method: 'POST',
      });
      if (res.ok) void fetchData();
    } catch {
      // Handled silently
    }
  };

  const handleDismissDecision = async (decisionId: string) => {
    try {
      const res = await fetch(`/api/admin/operations/decisions/${decisionId}/dismiss`, {
        method: 'POST',
      });
      if (res.ok) void fetchData();
    } catch {
      // Handled silently
    }
  };

  const handleExecuteDecisionAction = async () => {
    if (!selectedDecisionAction) return;
    setExecutingAction(true);
    setActionSuccess(null);
    try {
      const res = await fetch(
        `/api/admin/operations/actions/${selectedDecisionAction.action.id}/execute`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decisionId: selectedDecisionAction.decisionId,
            actionType: selectedDecisionAction.action.type,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Action execution failed');
      }
      setActionSuccess(`Action ${selectedDecisionAction.action.label} executed successfully.`);
      setTimeout(() => {
        setSelectedDecisionAction(null);
        setActionSuccess(null);
        void fetchData();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to execute action');
    } finally {
      setExecutingAction(false);
    }
  };

  // Incident Manual Action Handler
  const handleExecuteIncidentAction = async () => {
    if (!actionModal) return;
    setSubmittingIncidentAction(true);
    const { type, incidentId } = actionModal;

    try {
      let endpoint = `/api/admin/incidents/${incidentId}/recover`;
      let payload: Record<string, unknown> = {};

      if (type === 'RESOLVE') {
        endpoint = `/api/admin/incidents/${incidentId}/resolve`;
        payload = { notes: actionInputReason || 'Resolved manually via Command Center' };
      } else if (type === 'DISMISS') {
        endpoint = `/api/admin/incidents/${incidentId}/dismiss`;
        payload = { reason: actionInputReason || 'Dismissed manually by operator' };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || errData?.message || 'Operation failed');
      }

      setActionModal(null);
      setActionInputReason('');
      void fetchData();
      void fetchIncidents();
      if (selectedIncidentId === incidentId) {
        void fetchIncidentDetail(incidentId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action execution failed');
    } finally {
      setSubmittingIncidentAction(false);
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
      case 'RECOVERING':
      case 'INVESTIGATING':
        return 'bg-[#3a2000] text-[#ffb957] border-[#7d4e00]';
      case 'RESOLVED':
        return 'bg-[#1b2b00] text-[#a4f542] border-[#3f6300]';
      case 'ESCALATED':
        return 'bg-[#3b0909] text-[#ff8e8e] border-[#93000a]';
      case 'DISMISSED':
        return 'bg-[#222630] text-[#87948b] border-[#363b47]';
      default:
        return 'bg-[#181c24] text-[#dfe2ee] border-[#262a33]';
    }
  };

  // Filtered incidents by client-side search query
  const filteredIncidents = incidents.filter((inc) => {
    if (!incidentSearchQuery.trim()) return true;
    const q = incidentSearchQuery.toLowerCase();
    return (
      inc.incidentNumber.toLowerCase().includes(q) ||
      inc.type.toLowerCase().includes(q) ||
      inc.bookingId.toLowerCase().includes(q) ||
      inc.booking.pickupAddress?.toLowerCase().includes(q)
    );
  });

  return (
    <ControlStationLayout activePersona="admin" activePath="admin-operations">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#262a33] pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#68dba9] text-2xl">terminal</span>
              <h1 className="text-2xl font-bold text-[#dfe2ee] tracking-tight font-['Space_Grotesk']">
                Operations Command Center & Reliability Intelligence
              </h1>
            </div>
            <p className="text-xs text-[#87948b] mt-1 font-mono">
              Unified operational control, deterministic decision evaluation, automated
              reliability analytics & auditable manual actions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] flex items-center gap-2 font-mono text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  sseConnected ? 'bg-[#68dba9] animate-pulse' : 'bg-[#ffb957]'
                }`}
              />
              <span className="text-[#dfe2ee] font-bold">
                {sseConnected ? 'SSE LIVE STREAM' : 'POLLING FALLBACK'}
                {lastSyncTime ? ` (${lastSyncTime.toLocaleTimeString()})` : ''}
              </span>
            </div>

            <button
              onClick={() => {
                void fetchData();
                void fetchIncidents();
              }}
              className="px-3 py-1.5 rounded-lg bg-[#181c24] hover:bg-[#262a33] border border-[#262a33] text-[#dfe2ee] text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Sync Data
            </button>
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

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-2 border-b border-[#262a33] pb-2 font-mono text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-[#25a475] text-[#00311f] font-bold'
                : 'text-[#87948b] hover:text-[#dfe2ee] hover:bg-[#181c24]'
            }`}
          >
            <span className="material-symbols-outlined text-base">dashboard</span>
            Operational Overview
          </button>

          <button
            onClick={() => setActiveTab('incidents')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'incidents'
                ? 'bg-[#25a475] text-[#00311f] font-bold'
                : 'text-[#87948b] hover:text-[#dfe2ee] hover:bg-[#181c24]'
            }`}
          >
            <span className="material-symbols-outlined text-base">warning</span>
            Incident Management
            {intelligence?.activeIncidents ? (
              <span className="px-1.5 py-0.5 rounded-full bg-[#ff8e8e] text-[#3b0909] text-[10px] font-bold">
                {intelligence.activeIncidents}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab('reliability')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'reliability'
                ? 'bg-[#25a475] text-[#00311f] font-bold'
                : 'text-[#87948b] hover:text-[#dfe2ee] hover:bg-[#181c24]'
            }`}
          >
            <span className="material-symbols-outlined text-base">analytics</span>
            Reliability Intelligence
          </button>

          <button
            onClick={() => setActiveTab('actions')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'actions'
                ? 'bg-[#25a475] text-[#00311f] font-bold'
                : 'text-[#87948b] hover:text-[#dfe2ee] hover:bg-[#181c24]'
            }`}
          >
            <span className="material-symbols-outlined text-base">history</span>
            Actions & Audit Trail
          </button>
        </div>

        {/* TOP METRICS SUMMARY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col justify-between">
            <span className="text-[10px] font-mono text-[#87948b] uppercase tracking-wider">
              System Health
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
              Active Incidents
            </span>
            <div className="text-2xl font-bold font-['Space_Grotesk'] text-[#ff8e8e] mt-1">
              {intelligence?.activeIncidents ?? 0}
            </div>
            <span className="text-[10px] text-[#87948b] mt-1">Requiring Attention</span>
          </div>

          <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col justify-between">
            <span className="text-[10px] font-mono text-[#87948b] uppercase tracking-wider">
              Recovery Success
            </span>
            <div className="text-2xl font-bold font-['Space_Grotesk'] text-[#68dba9] mt-1">
              {intelligence?.recoverySuccessRate ?? 100}%
            </div>
            <span className="text-[10px] text-[#87948b] mt-1">
              Attempts: {intelligence?.recoveryAttemptsSummary.total ?? 0}
            </span>
          </div>

          <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col justify-between">
            <span className="text-[10px] font-mono text-[#87948b] uppercase tracking-wider">
              Avg Resolution Time
            </span>
            <div className="text-2xl font-bold font-['Space_Grotesk'] text-[#70d2ff] mt-1">
              {intelligence?.avgResolutionTimeMinutes ?? 0} m
            </div>
            <span className="text-[10px] text-[#87948b] mt-1">7-Day Rolling Avg</span>
          </div>

          <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col justify-between">
            <span className="text-[10px] font-mono text-[#87948b] uppercase tracking-wider">
              Dispatch Pressure
            </span>
            <div className="text-2xl font-bold font-['Space_Grotesk'] text-[#ffb957] mt-1">
              {summary.searchingBookingsCount}
            </div>
            <span className="text-[10px] text-[#87948b] mt-1">
              Available Drivers: {summary.availableDriversCount}
            </span>
          </div>

          <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-col justify-between">
            <span className="text-[10px] font-mono text-[#87948b] uppercase tracking-wider">
              Active Fleet Trips
            </span>
            <div className="text-2xl font-bold font-['Space_Grotesk'] text-[#dfe2ee] mt-1">
              {summary.activeTripsCount}
            </div>
            <span className="text-[10px] text-[#87948b] mt-1">In-Progress Rides</span>
          </div>
        </div>

        {/* TAB 1: OPERATIONAL OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Dispatch Pressure & Platform Telemetry Signals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#181c24] p-5 rounded-xl border border-[#262a33] space-y-3">
                <div className="flex items-center justify-between border-b border-[#262a33] pb-2">
                  <span className="text-xs font-bold text-[#dfe2ee] font-mono">
                    DISPATCH SEARCH PRESSURE
                  </span>
                  <span className="material-symbols-outlined text-[#68dba9]">radar</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold font-['Space_Grotesk'] text-[#dfe2ee]">
                    {summary.searchingBookingsCount}
                  </span>
                  <span className="text-xs font-mono text-[#87948b]">
                    searching / {summary.availableDriversCount} available drivers
                  </span>
                </div>
                <div className="w-full bg-[#0f131c] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#68dba9] h-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (summary.searchingBookingsCount /
                          Math.max(1, summary.availableDriversCount)) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-[#181c24] p-5 rounded-xl border border-[#262a33] space-y-3">
                <div className="flex items-center justify-between border-b border-[#262a33] pb-2">
                  <span className="text-xs font-bold text-[#dfe2ee] font-mono">
                    DELAYED SERVICES (&gt; 3 MINS)
                  </span>
                  <span className="material-symbols-outlined text-[#ffb957]">schedule</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold font-['Space_Grotesk'] text-[#ffb957]">
                    {intelligence?.dispatchPressure.delayedBookingsCount ?? 0}
                  </span>
                  <span className="text-xs font-mono text-[#87948b]">
                    High customer wait risk
                  </span>
                </div>
                <p className="text-[11px] text-[#87948b] font-mono">
                  Tracked by dispatch engine sweep for assignment timeout intervention.
                </p>
              </div>

              <div className="bg-[#181c24] p-5 rounded-xl border border-[#262a33] space-y-3">
                <div className="flex items-center justify-between border-b border-[#262a33] pb-2">
                  <span className="text-xs font-bold text-[#dfe2ee] font-mono">
                    ACTIVE SAFETY CASES
                  </span>
                  <span className="material-symbols-outlined text-[#ff8e8e]">shield</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold font-['Space_Grotesk'] text-[#ff8e8e]">
                    {summary.activeSafetyIncidentsCount}
                  </span>
                  <span className="text-xs font-mono text-[#87948b]">
                    Open support: {summary.openSupportTicketsCount}
                  </span>
                </div>
                <p className="text-[11px] text-[#87948b] font-mono">
                  Integrated with SOS Desk &amp; Customer Support Incident System.
                </p>
              </div>
            </div>

            {/* Active Operations Decisions Feed */}
            <div className="bg-[#181c24] rounded-xl border border-[#262a33] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262a33] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9]">psychology</span>
                  <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    Real-Time Operational Decisions Engine
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#87948b]">Filter Severity:</span>
                  <select
                    value={decisionSeverityFilter}
                    onChange={(e) => setDecisionSeverityFilter(e.target.value)}
                    className="bg-[#0f131c] border border-[#262a33] text-[#dfe2ee] text-xs font-mono rounded-lg px-2.5 py-1"
                  >
                    <option value="ALL">All Severities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs font-mono text-[#87948b]">
                  Evaluating live operational signals...
                </div>
              ) : decisions.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <span className="material-symbols-outlined text-3xl text-[#68dba9]">
                    check_circle
                  </span>
                  <p className="text-sm font-bold text-[#dfe2ee]">
                    All system parameters are within nominal baselines
                  </p>
                  <p className="text-xs text-[#87948b] font-mono">
                    No active operations decisions require manual intervention.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {decisions.map((decision) => (
                    <div
                      key={decision.id}
                      className="bg-[#0f131c] p-4 rounded-xl border border-[#262a33] space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262a33] pb-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getSeverityBadgeClass(
                              decision.severity,
                            )}`}
                          >
                            {decision.severity}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getStatusBadgeClass(
                              decision.status,
                            )}`}
                          >
                            {decision.status}
                          </span>
                          <h4 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                            {decision.title}
                          </h4>
                        </div>
                        <span className="text-[11px] font-mono text-[#87948b]">
                          {new Date(decision.createdAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                        <div className="md:col-span-2 space-y-1">
                          <p className="text-[#bccac0]">{decision.summary || decision.why}</p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {decision.evidence.map((ev, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded bg-[#181c24] border border-[#262a33] text-[10px] text-[#87948b]"
                              >
                                <strong className="text-[#dfe2ee]">{ev.label || ev.key}:</strong>{' '}
                                {String(ev.value)}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col justify-between items-end gap-2">
                          <div className="flex items-center gap-2">
                            {decision.status === 'DETECTED' && (
                              <>
                                <button
                                  onClick={() => handleAcknowledgeDecision(decision.id)}
                                  className="px-2.5 py-1 rounded bg-[#00344d] hover:bg-[#004d73] text-[#70d2ff] border border-[#004d73] text-xs font-mono"
                                >
                                  Ack
                                </button>
                                <button
                                  onClick={() => handleDismissDecision(decision.id)}
                                  className="px-2.5 py-1 rounded bg-[#181c24] hover:bg-[#222630] text-[#87948b] border border-[#262a33] text-xs font-mono"
                                >
                                  Dismiss
                                </button>
                              </>
                            )}

                            {decision.recommendedActions.length > 0 &&
                              decision.status !== 'RESOLVED' && (
                                <button
                                  onClick={() => {
                                    setSelectedDecisionAction({
                                      decisionId: decision.id,
                                      action: decision.recommendedActions[0],
                                    });
                                  }}
                                  className="px-3 py-1 rounded bg-[#25a475] hover:bg-[#1f8760] text-[#00311f] font-bold text-xs font-mono flex items-center gap-1"
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
            </div>
          </div>
        )}

        {/* TAB 2: INCIDENT MANAGEMENT */}
        {activeTab === 'incidents' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-[#181c24] p-4 rounded-xl border border-[#262a33] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#87948b]">Status:</span>
                  <select
                    value={incidentStatusFilter}
                    onChange={(e) => setIncidentStatusFilter(e.target.value)}
                    className="bg-[#0f131c] border border-[#262a33] rounded-lg px-3 py-1.5 text-xs font-mono text-[#dfe2ee]"
                  >
                    <option value="">All Statuses</option>
                    <option value="DETECTED">Detected</option>
                    <option value="RECOVERING">Recovering</option>
                    <option value="ESCALATED">Escalated</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="DISMISSED">Dismissed</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#87948b]">Severity:</span>
                  <select
                    value={incidentSeverityFilter}
                    onChange={(e) => setIncidentSeverityFilter(e.target.value)}
                    className="bg-[#0f131c] border border-[#262a33] rounded-lg px-3 py-1.5 text-xs font-mono text-[#dfe2ee]"
                  >
                    <option value="">All Severities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div className="w-full sm:w-64">
                <input
                  type="text"
                  value={incidentSearchQuery}
                  onChange={(e) => setIncidentSearchQuery(e.target.value)}
                  placeholder="Search incident #, booking ID, type..."
                  className="w-full bg-[#0f131c] border border-[#262a33] rounded-lg px-3 py-1.5 text-xs font-mono text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                />
              </div>
            </div>

            {/* Incidents List Table */}
            {filteredIncidents.length === 0 ? (
              <div className="bg-[#181c24] p-12 rounded-xl border border-[#262a33] text-center space-y-2">
                <span className="material-symbols-outlined text-3xl text-[#68dba9]">
                  check_circle
                </span>
                <p className="text-sm font-bold text-[#dfe2ee]">No active incidents found</p>
                <p className="text-xs text-[#87948b] font-mono">
                  All service reliability checks are nominal.
                </p>
              </div>
            ) : (
              <div className="bg-[#181c24] rounded-xl border border-[#262a33] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0f131c] text-[#87948b] uppercase border-b border-[#262a33]">
                      <tr>
                        <th className="px-4 py-3">Incident Ref</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Severity</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Booking ID</th>
                        <th className="px-4 py-3">Detected At</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262a33] text-[#dfe2ee]">
                      {filteredIncidents.map((inc) => (
                        <tr key={inc.id} className="hover:bg-[#1f2430] transition-colors">
                          <td className="px-4 py-3 font-bold text-[#68dba9]">
                            {inc.incidentNumber}
                          </td>
                          <td className="px-4 py-3 font-bold">{inc.type}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] border font-bold ${getSeverityBadgeClass(
                                inc.severity,
                              )}`}
                            >
                              {inc.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] border font-bold ${getStatusBadgeClass(
                                inc.status,
                              )}`}
                            >
                              {inc.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#87948b]">#{inc.bookingId.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-[#87948b]">
                            {new Date(inc.detectedAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSelectedIncidentId(inc.id)}
                              className="px-3 py-1 rounded bg-[#262a33] hover:bg-[#363b47] text-[#dfe2ee] font-bold text-xs"
                            >
                              Inspect Case →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="p-3 bg-[#0f131c] border-t border-[#262a33] flex items-center justify-between text-xs font-mono text-[#87948b]">
                  <span>
                    Page <strong className="text-[#dfe2ee]">{incidentPage}</strong> of{' '}
                    <strong className="text-[#dfe2ee]">{incidentTotalPages}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={incidentPage <= 1}
                      onClick={() => setIncidentPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 rounded bg-[#181c24] border border-[#262a33] disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      disabled={incidentPage >= incidentTotalPages}
                      onClick={() => setIncidentPage((p) => p + 1)}
                      className="px-3 py-1 rounded bg-[#181c24] border border-[#262a33] disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RELIABILITY INTELLIGENCE */}
        {activeTab === 'reliability' && intelligence && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recovery Performance Breakdown */}
              <div className="bg-[#181c24] p-5 rounded-xl border border-[#262a33] space-y-4">
                <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                  <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk'] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#68dba9]">
                      verified_user
                    </span>
                    Recovery Success Rate Analytics
                  </h3>
                  <span className="text-xs font-mono text-[#68dba9] font-bold">
                    {intelligence.recoverySuccessRate}% Success
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <div className="flex justify-between text-[#87948b] mb-1">
                      <span>Automated &amp; Operator Recovery Attempts</span>
                      <span className="text-[#dfe2ee]">
                        {intelligence.recoveryAttemptsSummary.succeeded} /{' '}
                        {intelligence.recoveryAttemptsSummary.total} Total
                      </span>
                    </div>
                    <div className="w-full bg-[#0f131c] h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-[#68dba9] h-full transition-all"
                        style={{ width: `${intelligence.recoverySuccessRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-2 text-center font-mono">
                    <div className="bg-[#0f131c] p-3 rounded-lg border border-[#262a33]">
                      <span className="text-[10px] text-[#87948b] block">Succeeded</span>
                      <span className="text-lg font-bold text-[#68dba9]">
                        {intelligence.recoveryAttemptsSummary.succeeded}
                      </span>
                    </div>
                    <div className="bg-[#0f131c] p-3 rounded-lg border border-[#262a33]">
                      <span className="text-[10px] text-[#87948b] block">Failed</span>
                      <span className="text-lg font-bold text-[#ff8e8e]">
                        {intelligence.recoveryAttemptsSummary.failed}
                      </span>
                    </div>
                    <div className="bg-[#0f131c] p-3 rounded-lg border border-[#262a33]">
                      <span className="text-[10px] text-[#87948b] block">Processing</span>
                      <span className="text-lg font-bold text-[#70d2ff]">
                        {intelligence.recoveryAttemptsSummary.processing}
                      </span>
                    </div>
                    <div className="bg-[#0f131c] p-3 rounded-lg border border-[#262a33]">
                      <span className="text-[10px] text-[#87948b] block">Cancelled</span>
                      <span className="text-lg font-bold text-[#87948b]">
                        {intelligence.recoveryAttemptsSummary.cancelled}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resolution Times & Velocity */}
              <div className="bg-[#181c24] p-5 rounded-xl border border-[#262a33] space-y-4">
                <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
                  <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk'] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#70d2ff]">timer</span>
                    Resolution Velocity &amp; MTTR
                  </h3>
                  <span className="text-xs font-mono text-[#70d2ff] font-bold">
                    {intelligence.avgResolutionTimeMinutes} mins avg
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="bg-[#0f131c] p-4 rounded-lg border border-[#262a33] space-y-2">
                    <span className="text-[10px] text-[#87948b] uppercase tracking-wider block">
                      Mean Time to Resolution (7 Days)
                    </span>
                    <div className="text-2xl font-bold font-['Space_Grotesk'] text-[#dfe2ee]">
                      {intelligence.avgResolutionTimeMinutes} minutes
                    </div>
                    <p className="text-[11px] text-[#87948b]">
                      Measured from anomaly detection timestamp (`detectedAt`) to automated or
                      operator resolution (`resolvedAt`).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recurring Incident Patterns */}
            <div className="bg-[#181c24] p-5 rounded-xl border border-[#262a33] space-y-4">
              <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk'] flex items-center gap-2 border-b border-[#262a33] pb-3">
                <span className="material-symbols-outlined text-[#ffb957]">repeat</span>
                Top Recurring Incident Patterns (Last 7 Days)
              </h3>

              {intelligence.recurringIncidents.length === 0 ? (
                <div className="text-center py-6 text-xs font-mono text-[#87948b]">
                  No recurring incident patterns recorded in timeframe.
                </div>
              ) : (
                <div className="space-y-3">
                  {intelligence.recurringIncidents.map((pattern, i) => (
                    <div
                      key={i}
                      className="bg-[#0f131c] p-3 rounded-lg border border-[#262a33] space-y-2 font-mono text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#dfe2ee]">{pattern.type}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[#87948b]">
                            {pattern.count} cases ({pattern.percentage}%)
                          </span>
                          <span className="text-[#68dba9] font-bold">
                            Avg resolution: {pattern.avgResolutionMinutes}m
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-[#181c24] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#ffb957] h-full transition-all"
                          style={{ width: `${Math.min(100, pattern.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Failed Recovery Trends */}
            <div className="bg-[#181c24] p-5 rounded-xl border border-[#262a33] space-y-4">
              <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk'] flex items-center gap-2 border-b border-[#262a33] pb-3">
                <span className="material-symbols-outlined text-[#ff8e8e]">error_medkit</span>
                Failed Recovery Root-Cause Trends
              </h3>

              {intelligence.failedRecoveryTrends.length === 0 ? (
                <div className="text-center py-6 text-xs font-mono text-[#87948b]">
                  Zero failed recovery attempts in timeframe.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0f131c] text-[#87948b] border-b border-[#262a33]">
                      <tr>
                        <th className="px-4 py-2.5">Failure Code</th>
                        <th className="px-4 py-2.5">Failed Attempt Count</th>
                        <th className="px-4 py-2.5">Last Occurred</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262a33] text-[#dfe2ee]">
                      {intelligence.failedRecoveryTrends.map((trend, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2.5 font-bold text-[#ff8e8e]">
                            {trend.failureCode}
                          </td>
                          <td className="px-4 py-2.5 font-bold">{trend.count}</td>
                          <td className="px-4 py-2.5 text-[#87948b]">
                            {trend.lastOccurredAt
                              ? new Date(trend.lastOccurredAt).toLocaleString()
                              : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ACTIONS & AUDIT TRAIL */}
        {activeTab === 'actions' && (
          <div className="bg-[#181c24] p-5 rounded-xl border border-[#262a33] space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
              <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk'] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#68dba9]">gavel</span>
                Operational Actions &amp; Audit Trail
              </h3>
              <span className="text-[#87948b]">Auditable &amp; Idempotent Execution Log</span>
            </div>

            <p className="text-[#bccac0]">
              All manual recovery triggers, decision actions, and incident dismissals are tracked
              with strict RBAC authentication and idempotency locks.
            </p>

            <div className="space-y-3">
              {decisions.map((d) => (
                <div
                  key={d.id}
                  className="bg-[#0f131c] p-4 rounded-xl border border-[#262a33] space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#68dba9]">{d.title}</span>
                    <span className="text-[#87948b] text-[11px]">
                      {new Date(d.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[#bccac0] text-[11px]">
                    Status: <strong className="text-[#dfe2ee]">{d.status}</strong> | Severity:{' '}
                    <strong className="text-[#dfe2ee]">{d.severity}</strong> | Zone:{' '}
                    <strong className="text-[#dfe2ee]">{d.zoneId || 'GLOBAL'}</strong>
                  </div>
                  {d.recommendedActions.length > 0 && (
                    <div className="text-[10px] text-[#87948b] pt-1">
                      Action Available: {d.recommendedActions[0].label} (Type: {d.recommendedActions[0].type})
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SLIDE-OVER DRAWER FOR INCIDENT DETAILS */}
      {selectedIncidentId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#181c24] border-l border-[#262a33] h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto space-y-6">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-[#262a33] pb-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#ffb957] text-2xl">
                    warning
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                      Incident {selectedIncidentDetail?.incidentNumber ?? selectedIncidentId}
                    </h3>
                    <p className="text-xs text-[#87948b] font-mono">
                      Service Reliability Incident Case Control
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedIncidentId(null);
                    setSelectedIncidentDetail(null);
                  }}
                  className="text-[#87948b] hover:text-[#dfe2ee] text-sm font-mono"
                >
                  ✕
                </button>
              </div>

              {loadingDrawer ? (
                <div className="py-12 text-center text-xs font-mono text-[#87948b]">
                  Loading incident control case...
                </div>
              ) : selectedIncidentDetail ? (
                <div className="space-y-6 pt-4 font-mono text-xs">
                  {/* Incident Summary Metadata */}
                  <div className="bg-[#0f131c] p-4 rounded-xl border border-[#262a33] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[#87948b]">Incident Type:</span>
                      <span className="font-bold text-[#dfe2ee]">
                        {selectedIncidentDetail.type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#87948b]">Severity:</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadgeClass(
                          selectedIncidentDetail.severity,
                        )}`}
                      >
                        {selectedIncidentDetail.severity}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#87948b]">Status:</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeClass(
                          selectedIncidentDetail.status,
                        )}`}
                      >
                        {selectedIncidentDetail.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#87948b]">Booking ID:</span>
                      <span className="text-[#68dba9] font-bold">
                        #{selectedIncidentDetail.bookingId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#87948b]">Detected At:</span>
                      <span className="text-[#dfe2ee]">
                        {new Date(selectedIncidentDetail.detectedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Booking Location Details */}
                  <div className="bg-[#0f131c] p-4 rounded-xl border border-[#262a33] space-y-2">
                    <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider block">
                      Booking Pickup &amp; Location
                    </span>
                    <div className="text-[#dfe2ee]">
                      <strong>Pickup:</strong> {selectedIncidentDetail.booking.pickupAddress}
                    </div>
                    {selectedIncidentDetail.booking.dropoffAddress && (
                      <div className="text-[#dfe2ee]">
                        <strong>Dropoff:</strong> {selectedIncidentDetail.booking.dropoffAddress}
                      </div>
                    )}
                  </div>

                  {/* Recovery Attempts History */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider block">
                      Recovery Attempts History (
                      {selectedIncidentDetail.recoveryAttempts?.length || 0})
                    </span>
                    {selectedIncidentDetail.recoveryAttempts?.length === 0 ? (
                      <div className="p-3 bg-[#0f131c] rounded-lg border border-[#262a33] text-[#87948b]">
                        No recovery attempts recorded yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedIncidentDetail.recoveryAttempts.map((attempt) => (
                          <div
                            key={attempt.id}
                            className="bg-[#0f131c] p-3 rounded-lg border border-[#262a33] space-y-1"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-[#68dba9]">
                                Attempt #{attempt.attemptNumber}: {attempt.action}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  attempt.status === 'SUCCEEDED'
                                    ? 'bg-[#1b2b00] text-[#a4f542]'
                                    : attempt.status === 'FAILED'
                                      ? 'bg-[#3b0909] text-[#ff8e8e]'
                                      : 'bg-[#262a33] text-[#dfe2ee]'
                                }`}
                              >
                                {attempt.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#87948b]">
                              Triggered by: {attempt.triggeredBy} | Idempotency:{' '}
                              {attempt.idempotencyKey}
                            </div>
                            {attempt.failureSummary && (
                              <div className="text-[10px] text-[#ff8e8e]">
                                Failure: {attempt.failureSummary}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Timeline Entries */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider block">
                      Incident Audit Timeline ({selectedIncidentDetail.timelineEntries?.length || 0})
                    </span>
                    <div className="space-y-2">
                      {selectedIncidentDetail.timelineEntries.map((t) => (
                        <div
                          key={t.id}
                          className="bg-[#0f131c] p-3 rounded-lg border border-[#262a33] space-y-1"
                        >
                          <div className="flex justify-between items-center text-[#dfe2ee]">
                            <span className="font-bold">{t.action}</span>
                            <span className="text-[10px] text-[#87948b]">
                              {new Date(t.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          {t.notes && <div className="text-[11px] text-[#bccac0]">{t.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs font-mono text-[#ff8e8e]">
                  Incident not found or error loading details.
                </div>
              )}
            </div>

            {/* Action Bar Footer */}
            {selectedIncidentDetail && (
              <div className="pt-4 border-t border-[#262a33] flex flex-wrap items-center justify-end gap-3 font-mono text-xs">
                <button
                  onClick={() =>
                    setActionModal({ type: 'RECOVER', incidentId: selectedIncidentDetail.id })
                  }
                  className="px-4 py-2 rounded-lg bg-[#25a475] hover:bg-[#1f8760] text-[#00311f] font-bold flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  Trigger Manual Recovery
                </button>

                <button
                  onClick={() =>
                    setActionModal({ type: 'RESOLVE', incidentId: selectedIncidentDetail.id })
                  }
                  className="px-4 py-2 rounded-lg bg-[#00344d] hover:bg-[#004d73] text-[#70d2ff] border border-[#004d73]"
                >
                  Resolve Incident
                </button>

                <button
                  onClick={() =>
                    setActionModal({ type: 'DISMISS', incidentId: selectedIncidentDetail.id })
                  }
                  className="px-4 py-2 rounded-lg bg-[#181c24] hover:bg-[#222630] text-[#87948b] border border-[#262a33]"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DECISION ACTION EXECUTION MODAL */}
      {selectedDecisionAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#181c24] border border-[#262a33] rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffb957] text-xl">warning</span>
                <h3 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                  Confirm Operational Action Execution
                </h3>
              </div>
              <button
                onClick={() => setSelectedDecisionAction(null)}
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
                  <p className="text-[#dfe2ee] font-bold">{selectedDecisionAction.action.label}</p>
                  <p className="text-[#bccac0]">{selectedDecisionAction.action.impactSummary}</p>
                  <div className="bg-[#0f131c] p-3 rounded-lg border border-[#262a33] space-y-1">
                    <span className="text-[10px] text-[#87948b] uppercase tracking-wider block">
                      Lock Guard Protection
                    </span>
                    <div className="text-[#68dba9] font-bold">
                      {selectedDecisionAction.action.type}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262a33]">
                  <button
                    onClick={() => setSelectedDecisionAction(null)}
                    disabled={executingAction}
                    className="px-4 py-2 rounded-lg bg-[#0f131c] border border-[#262a33] text-[#dfe2ee] text-xs font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteDecisionAction}
                    disabled={executingAction}
                    className="px-4 py-2 rounded-lg bg-[#25a475] hover:bg-[#1f8760] text-[#00311f] font-bold text-xs font-mono flex items-center gap-2 disabled:opacity-50"
                  >
                    {executingAction ? 'Executing...' : 'Authorize & Execute'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* INCIDENT MANUAL ACTION MODAL */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#181c24] border border-[#262a33] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
              <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                Confirm {actionModal.type} Action
              </h3>
              <button
                onClick={() => setActionModal(null)}
                className="text-[#87948b] hover:text-[#dfe2ee]"
              >
                ✕
              </button>
            </div>

            <p className="text-[#bccac0]">
              {actionModal.type === 'RECOVER'
                ? 'Trigger authorized manual recovery retry for this incident.'
                : actionModal.type === 'RESOLVE'
                  ? 'Mark this incident as RESOLVED. Please provide resolution notes.'
                  : 'Dismiss this incident. A mandatory reason string is required.'}
            </p>

            {actionModal.type !== 'RECOVER' && (
              <div>
                <label className="block text-[10px] text-[#87948b] uppercase mb-1">
                  Reason / Notes:
                </label>
                <textarea
                  value={actionInputReason}
                  onChange={(e) => setActionInputReason(e.target.value)}
                  placeholder="Enter reason or notes..."
                  className="w-full bg-[#0f131c] border border-[#262a33] rounded-lg p-2.5 text-xs text-[#dfe2ee] focus:outline-none focus:border-[#68dba9]"
                  rows={3}
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262a33]">
              <button
                onClick={() => setActionModal(null)}
                disabled={submittingIncidentAction}
                className="px-4 py-2 rounded-lg bg-[#0f131c] border border-[#262a33] text-[#dfe2ee]"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteIncidentAction}
                disabled={submittingIncidentAction}
                className="px-4 py-2 rounded-lg bg-[#25a475] hover:bg-[#1f8760] text-[#00311f] font-bold disabled:opacity-50"
              >
                {submittingIncidentAction ? 'Processing...' : 'Confirm & Execute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ControlStationLayout>
  );
}
