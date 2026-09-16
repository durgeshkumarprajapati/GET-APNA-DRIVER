'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin-layout';
import type { OperationsDecision } from '@/modules/operations';

interface DecisionDetailPageProps {
  params: Promise<{
    decisionId: string;
  }>;
}

export default function DecisionDetailPage({ params }: DecisionDetailPageProps) {
  const resolvedParams = use(params);
  const decisionId = resolvedParams.decisionId;

  const [decision, setDecision] = useState<OperationsDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchDecisionDetail = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/admin/operations/decisions/${decisionId}`);
      if (!res.ok) {
        throw new Error('Failed to load decision detail record');
      }
      const data = await res.json();
      setDecision(data.decision ?? data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching decision');
    } finally {
      setLoading(false);
    }
  }, [decisionId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/operations/decisions/${decisionId}`);
        if (!res.ok) {
          throw new Error('Failed to load decision detail record');
        }
        const data = await res.json();
        if (active) {
          setDecision(data.decision ?? data.data);
          setError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Error fetching decision');
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [decisionId]);

  const handleExecuteAction = async (actionId: string, actionType: string) => {
    setExecutingActionId(actionId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/operations/actions/${actionId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionId, actionType }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Action execution failed');
      }
      setActionMessage(`Action ${actionType} executed successfully.`);
      void fetchDecisionDetail();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setExecutingActionId(null);
    }
  };

  const getSeverityClass = (sev: string) => {
    switch (sev) {
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Navigation Back Header */}
        <div className="flex items-center justify-between border-b border-[#262a33] pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/operations-command-center"
              className="p-2 rounded-lg bg-[#181c24] border border-[#262a33] hover:border-[#68dba9] text-[#dfe2ee] transition-all flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                Decision Record: {decisionId}
              </h1>
              <p className="text-xs text-[#87948b] font-mono mt-0.5">
                Detailed evidence trail, raw signal values, and action dispatch logs
              </p>
            </div>
          </div>
          <button
            onClick={() => void fetchDecisionDetail()}
            className="px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262a33] hover:border-[#68dba9] text-[#dfe2ee] text-xs font-mono flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh Record
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-[#3b0909] border border-[#93000a] text-[#ff8e8e] text-xs font-mono">
            {error}
          </div>
        )}

        {actionMessage && (
          <div className="p-4 rounded-xl bg-[#1b2b00] border border-[#3f6300] text-[#a4f542] text-xs font-mono flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{actionMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-[#181c24] p-12 rounded-xl border border-[#262a33] text-center text-xs font-mono text-[#87948b]">
            Loading decision record details...
          </div>
        ) : !decision ? (
          <div className="bg-[#181c24] p-12 rounded-xl border border-[#262a33] text-center text-xs font-mono text-[#87948b]">
            Decision record not found or expired.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column — Summary & Evidence */}
            <div className="lg:col-span-2 space-y-6">
              {/* Overview Card */}
              <div className="bg-[#181c24] p-6 rounded-xl border border-[#262a33] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#262a33] pb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${getSeverityClass(
                        decision.severity,
                      )}`}
                    >
                      {decision.severity}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#0f131c] text-[#68dba9] border border-[#262a33]">
                      STATUS: {decision.status}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#87948b]">
                    Evaluated At:{' '}
                    <strong className="text-[#dfe2ee]">
                      {new Date(decision.createdAt).toLocaleString()}
                    </strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-[#dfe2ee] font-['Space_Grotesk']">
                    {decision.title}
                  </h2>
                  <p className="text-xs font-mono text-[#bccac0] leading-relaxed">
                    {decision.summary || decision.why}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-[#262a33] text-xs font-mono">
                  <div>
                    <span className="text-[#87948b] block text-[10px] uppercase">
                      Decision Type
                    </span>
                    <strong className="text-[#dfe2ee]">{decision.decisionType}</strong>
                  </div>
                  <div>
                    <span className="text-[#87948b] block text-[10px] uppercase">Zone ID</span>
                    <strong className="text-[#dfe2ee]">{decision.zoneId ?? 'SYSTEM'}</strong>
                  </div>
                  <div>
                    <span className="text-[#87948b] block text-[10px] uppercase">Confidence</span>
                    <strong className="text-[#68dba9]">{decision.confidence}</strong>
                  </div>
                </div>
              </div>

              {/* Evidence Breakdown Card */}
              <div className="bg-[#181c24] p-6 rounded-xl border border-[#262a33] space-y-4">
                <h3 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk'] uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-base">
                    fact_check
                  </span>
                  Evidence Metric Trail
                </h3>

                <div className="space-y-3">
                  {decision.evidence.map((ev, idx) => (
                    <div
                      key={idx}
                      className="bg-[#0f131c] p-4 rounded-lg border border-[#262a33] flex items-center justify-between text-xs font-mono"
                    >
                      <div className="space-y-1">
                        <span className="text-[#dfe2ee] font-bold block">{ev.label || ev.key}</span>
                        {ev.expected && (
                          <span className="text-[11px] text-[#87948b]">
                            Threshold / Target: {String(ev.expected)}
                          </span>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[#68dba9] font-bold text-sm block">
                          {String(ev.value)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impact Card */}
              <div className="bg-[#181c24] p-6 rounded-xl border border-[#262a33] space-y-2">
                <h3 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk'] uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#70d2ff] text-base">
                    analytics
                  </span>
                  Expected Impact
                </h3>
                <p className="text-xs font-mono text-[#bccac0]">{decision.expectedImpact}</p>
              </div>
            </div>

            {/* Right Column — Recommended Actions & Lifecycle History */}
            <div className="space-y-6">
              {/* Actions Section */}
              <div className="bg-[#181c24] p-6 rounded-xl border border-[#262a33] space-y-4">
                <h3 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk'] uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ffb957] text-base">bolt</span>
                  Available Orchestration Actions
                </h3>

                {decision.recommendedActions.length === 0 ? (
                  <div className="p-4 rounded-lg bg-[#0f131c] border border-[#262a33] text-center text-xs font-mono text-[#87948b]">
                    No executable actions prescribed for this decision.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {decision.recommendedActions.map((action) => (
                      <div
                        key={action.id}
                        className="bg-[#0f131c] p-4 rounded-lg border border-[#262a33] space-y-3 text-xs font-mono"
                      >
                        <div>
                          <span className="text-[#68dba9] font-bold block">{action.label}</span>
                          <span className="text-[#87948b] text-[11px] mt-1 block">
                            {action.impactSummary}
                          </span>
                        </div>

                        <div className="p-2 rounded bg-[#181c24] border border-[#262a33]">
                          <span className="text-[10px] text-[#87948b] uppercase block">
                            Action Category
                          </span>
                          <span className="text-[#dfe2ee] font-bold">{action.category}</span>
                        </div>

                        <button
                          onClick={() => handleExecuteAction(action.id, action.type)}
                          disabled={
                            executingActionId === action.id || decision.status === 'RESOLVED'
                          }
                          className="w-full py-2 px-3 rounded-lg bg-[#25a475] hover:bg-[#1f8760] text-[#00311f] font-bold text-xs font-mono transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {executingActionId === action.id ? (
                            <>
                              <span className="w-3 h-3 border-2 border-[#00311f] border-t-transparent rounded-full animate-spin" />
                              Dispatching Action...
                            </>
                          ) : decision.status === 'RESOLVED' ? (
                            'Action Already Executed'
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm">bolt</span>
                              Execute {action.type}
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lifecycle & Safety Guard Notice */}
              <div className="bg-[#181c24] p-6 rounded-xl border border-[#262a33] space-y-3 text-xs font-mono">
                <h3 className="text-sm font-bold text-[#dfe2ee] font-['Space_Grotesk'] uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#68dba9] text-base">shield</span>
                  Orchestrator Safety Guard
                </h3>
                <p className="text-[#87948b] leading-relaxed">
                  All action dispatches acquire distributed Redis locks before mutating domain
                  state. High & Critical actions require explicit human operator confirmation.
                </p>
                <div className="pt-2 border-t border-[#262a33] text-[11px] text-[#68dba9]">
                  ✓ Domain DB Direct Mutation Blocked
                  <br />✓ Domain Layer Orchestration Enforced
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
