'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin-layout';
import type { RiskDecision, RiskExplanationSummary } from '@/modules/risk';

export default function RiskDecisionDetailPage() {
  const params = useParams();
  const riskId = params?.riskId as string;

  const [decision, setDecision] = useState<RiskDecision | null>(null);
  const [explanation, setExplanation] = useState<RiskExplanationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action execution state
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!riskId) return;
    try {
      setError(null);
      const res = await fetch(`/api/admin/risk/decisions/${riskId}`);
      if (!res.ok) {
        throw new Error(`Failed to load risk decision '${riskId}'`);
      }
      const data = await res.json();
      setDecision(data.decision);
      setExplanation(data.explanation);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading risk detail');
    } finally {
      setLoading(false);
    }
  }, [riskId]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) {
        await fetchDetail();
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [fetchDetail]);

  const handleExecuteAction = async (actionId: string) => {
    try {
      setExecutingActionId(actionId);
      setActionFeedback(null);
      const res = await fetch(`/api/admin/risk/actions/${actionId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riskId,
          operatorId: 'admin_inspector',
          notes: 'Executed from Risk Detail Inspector UI',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Action execution failed');
      }

      setActionFeedback(data.result?.message || 'Action executed successfully.');
      void fetchDetail();
    } catch (err: unknown) {
      setActionFeedback(`Error: ${err instanceof Error ? err.message : 'Action failed'}`);
    } finally {
      setExecutingActionId(null);
    }
  };

  const handleStateChange = async (action: 'acknowledge' | 'dismiss' | 'escalate') => {
    try {
      const res = await fetch(`/api/admin/risk/decisions/${riskId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId: 'admin_inspector' }),
      });
      if (res.ok) {
        void fetchDetail();
      }
    } catch {
      // Handled silently
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8 text-center text-slate-400 bg-slate-950 min-h-screen">
          Loading risk inspection details...
        </div>
      </AdminLayout>
    );
  }

  if (error || !decision) {
    return (
      <AdminLayout>
        <div className="p-8 space-y-4 bg-slate-950 text-slate-100 min-h-screen">
          <Link href="/admin/risk-and-trust" className="text-xs text-emerald-400 hover:underline">
            ← Back to Risk Console
          </Link>
          <div className="p-4 bg-rose-950 border border-rose-800 rounded-xl text-rose-200 text-sm">
            {error || 'Risk decision not found.'}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/risk-and-trust"
            className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
          >
            ← Back to Risk & Trust Console
          </Link>
          <span className="font-mono text-xs text-slate-500">
            Correlation ID: {decision.fingerprint}
          </span>
        </div>

        {/* Title Header Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{explanation?.headline}</h1>
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-slate-800 text-indigo-300 border border-indigo-700/50 rounded">
                  {decision.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Subject: <strong className="text-slate-200">{decision.subjectName}</strong> (
                {decision.subjectType} ID: {decision.subjectId})
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-slate-400">Risk Score</div>
                <div className="text-2xl font-extrabold text-white">
                  {decision.riskScore}{' '}
                  <span className="text-sm font-normal text-slate-500">/ 100</span>
                </div>
              </div>
              <div className="text-right pl-4 border-l border-slate-800">
                <div className="text-xs text-slate-400">Confidence</div>
                <div className="text-sm font-bold text-emerald-400">{decision.confidence}</div>
              </div>
            </div>
          </div>

          {/* Quick Operator Status Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-800/80">
            <span className="text-xs text-slate-400 font-semibold mr-2">
              Operator Review Actions:
            </span>
            {decision.status !== 'ACKNOWLEDGED' && (
              <button
                onClick={() => handleStateChange('acknowledge')}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
              >
                Acknowledge Risk
              </button>
            )}
            {decision.status !== 'DISMISSED' && (
              <button
                onClick={() => handleStateChange('dismiss')}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              >
                Dismiss Risk
              </button>
            )}
            {decision.status !== 'ESCALATED' && (
              <button
                onClick={() => handleStateChange('escalate')}
                className="px-3 py-1.5 text-xs font-medium bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800/60 rounded-lg transition"
              >
                Escalate to Senior Ops
              </button>
            )}
          </div>
        </div>

        {actionFeedback && (
          <div
            role="status"
            className="p-4 bg-emerald-950/70 border border-emerald-800 rounded-xl text-emerald-200 text-xs"
          >
            {actionFeedback}
          </div>
        )}

        {/* 2-Column Inspection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Evidence & Signals */}
          <div className="md:col-span-2 space-y-6">
            {/* Risk Evidence Card */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Risk Evidence Breakdown
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                {decision.evidence.why}
              </p>

              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-slate-400">
                  Triggered Policy Factors:
                </span>
                <ul className="space-y-2">
                  {decision.evidence.evidenceItems.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-xs text-slate-200 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800"
                    >
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Collected Signals Table */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Raw Telemetry & Signals
              </h2>
              {decision.signals.length === 0 ? (
                <p className="text-xs text-slate-500">No low-level raw signals attached.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Signal Name</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5">Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {decision.signals.map((sig) => (
                        <tr key={sig.signalId}>
                          <td className="p-2.5 font-mono text-slate-400">{sig.category}</td>
                          <td className="p-2.5 font-semibold text-slate-200">{sig.name}</td>
                          <td className="p-2.5 text-slate-300">{sig.description}</td>
                          <td className="p-2.5 font-mono text-amber-400">+{sig.weight}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Recommended Actions & Timeline */}
          <div className="space-y-6">
            {/* Recommended Actions Panel */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Recommended Advisory Actions
              </h2>
              <div className="space-y-3">
                {decision.recommendedActions.map((act) => (
                  <div
                    key={act.actionId}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white">{act.title}</h3>
                      {act.executed ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                          EXECUTED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-800 text-slate-400 rounded">
                          PENDING
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">{act.description}</p>
                    {!act.executed && (
                      <button
                        onClick={() => handleExecuteAction(act.actionId)}
                        disabled={executingActionId === act.actionId}
                        className="w-full mt-2 py-1.5 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-lg transition"
                      >
                        {executingActionId === act.actionId ? 'Executing...' : 'Execute Action'}
                      </button>
                    )}
                    {act.executed && act.resultSummary && (
                      <p className="text-[10px] text-emerald-400/90 font-mono pt-1">
                        {act.resultSummary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Audit & Lifecycle Timeline Card */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Decision Audit Lifecycle
              </h2>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Created:</span>
                  <span className="font-mono text-slate-200">
                    {new Date(decision.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Last Evaluated:</span>
                  <span className="font-mono text-slate-200">
                    {new Date(decision.updatedAt).toLocaleString()}
                  </span>
                </div>
                {decision.acknowledgedAt && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Acknowledged:</span>
                    <span className="font-mono text-slate-200">{decision.acknowledgedBy}</span>
                  </div>
                )}
                {decision.dismissedAt && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Dismissed:</span>
                    <span className="font-mono text-slate-200">{decision.dismissedBy}</span>
                  </div>
                )}
                {decision.escalatedAt && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Escalated:</span>
                    <span className="font-mono text-slate-200">{decision.escalatedBy}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
