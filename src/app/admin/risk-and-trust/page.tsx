'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { RiskDecision, RiskOverviewSummary } from '@/modules/risk';

export default function RiskAndTrustConsolePage() {
  const [summary, setSummary] = useState<RiskOverviewSummary | null>(null);
  const [decisions, setDecisions] = useState<RiskDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      let decisionsUrl = '/api/admin/risk/decisions?';
      if (subjectFilter !== 'ALL') decisionsUrl += `subjectType=${subjectFilter}&`;
      if (statusFilter !== 'ALL') decisionsUrl += `status=${statusFilter}&`;
      if (searchQuery) decisionsUrl += `search=${encodeURIComponent(searchQuery)}&`;

      const [sumRes, decRes] = await Promise.all([fetch('/api/admin/risk'), fetch(decisionsUrl)]);

      if (!sumRes.ok || !decRes.ok) {
        throw new Error('Failed to load risk intelligence data');
      }

      const sumData = await sumRes.json();
      const decData = await decRes.json();

      setSummary(sumData.summary ?? null);
      setDecisions(decData.decisions ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading risk intelligence console');
    } finally {
      setLoading(false);
    }
  }, [subjectFilter, statusFilter, searchQuery]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) {
        await fetchData();
      }
    };
    void run();
    const interval = setInterval(() => {
      void run();
    }, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  const handleAction = async (riskId: string, action: 'acknowledge' | 'dismiss' | 'escalate') => {
    try {
      const res = await fetch(`/api/admin/risk/decisions/${riskId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId: 'admin_hud' }),
      });
      if (res.ok) {
        void fetchData();
      }
    } catch {
      // Handled silently
    }
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 75) return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    if (score >= 50) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (score >= 25) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-950 text-rose-300 border border-rose-700/50">
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-700/50">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-950 text-yellow-300 border border-yellow-700/50">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-300 border border-emerald-700/50">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* Header HUD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Trust, Fraud & Risk Intelligence Engine
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full">
              Phase 51 Engine
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic real-time decision-support layer for platform trust, fraud prevention, and
            account risk.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/operations-command-center"
            className="px-3.5 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-200 transition"
          >
            Operations Command Center →
          </Link>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-200 text-sm"
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs font-medium text-slate-400">Total Active Risks</div>
          <div className="text-2xl font-bold text-white mt-1">
            {loading ? '...' : (summary?.totalActiveRisks ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Evaluated real-time</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-900/40">
          <div className="text-xs font-medium text-rose-400">Critical Severity</div>
          <div className="text-2xl font-bold text-rose-300 mt-1">
            {loading ? '...' : (summary?.criticalRisksCount ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Score 75–100</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-900/40">
          <div className="text-xs font-medium text-amber-400">High Severity</div>
          <div className="text-2xl font-bold text-amber-300 mt-1">
            {loading ? '...' : (summary?.highRisksCount ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Score 50–74</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-yellow-900/40">
          <div className="text-xs font-medium text-yellow-400">Medium Severity</div>
          <div className="text-2xl font-bold text-yellow-300 mt-1">
            {loading ? '...' : (summary?.mediumRisksCount ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Score 25–49</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-indigo-900/40">
          <div className="text-xs font-medium text-indigo-400">Review Required</div>
          <div className="text-2xl font-bold text-indigo-300 mt-1">
            {loading ? '...' : (summary?.reviewRequiredCount ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Action queue</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Subject Filter:
          </span>
          {[
            'ALL',
            'CUSTOMER',
            'DRIVER',
            'BOOKING',
            'PAYMENT',
            'REFERRAL',
            'PROMOTION',
            'ACCOUNT',
          ].map((subj) => (
            <button
              key={subj}
              onClick={() => setSubjectFilter(subj)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                subjectFilter === subj
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-slate-800">
          <input
            type="text"
            placeholder="Search by Risk ID, Subject ID or Risk Type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="REVIEW_REQUIRED">Review Required</option>
            <option value="DETECTED">Detected</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="ACTION_IN_PROGRESS">Action in Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
            <option value="ESCALATED">Escalated</option>
          </select>
        </div>
      </div>

      {/* Decisions Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Active Risk Intelligence Feed</h2>
          <span className="text-xs text-slate-400">
            {decisions.length} records matching criteria
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading risk decisions...</div>
        ) : decisions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No risk records found for selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Risk ID</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Score & Level</th>
                  <th className="p-3">Risk Type</th>
                  <th className="p-3">Confidence</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Evidence</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {decisions.map((d) => (
                  <tr key={d.riskId} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono text-[11px] text-slate-300">
                      <Link
                        href={`/admin/risk-and-trust/${d.riskId}`}
                        className="text-emerald-400 hover:underline"
                      >
                        {d.riskId}
                      </Link>
                    </td>
                    <td className="p-3 font-medium text-slate-200">
                      {d.subjectName || `${d.subjectType} #${d.subjectId}`}
                      <div className="text-[10px] text-slate-500">{d.subjectType}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded border text-xs font-mono font-bold ${getScoreColorClass(d.riskScore)}`}
                        >
                          {d.riskScore}
                        </span>
                        {getLevelBadge(d.riskLevel)}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-300">{d.riskType}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                        {d.confidence} CONFIDENCE
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-indigo-300 border border-indigo-700/40">
                        {d.status}
                      </span>
                    </td>
                    <td
                      className="p-3 max-w-xs truncate text-slate-400 text-[11px]"
                      title={d.evidence.why}
                    >
                      {d.evidence.evidenceItems[0] || d.evidence.why}
                    </td>
                    <td className="p-3 text-right space-x-1.5">
                      <Link
                        href={`/admin/risk-and-trust/${d.riskId}`}
                        className="px-2.5 py-1 text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800 rounded hover:bg-emerald-900 transition inline-block"
                      >
                        Inspect
                      </Link>
                      {d.status !== 'ACKNOWLEDGED' && (
                        <button
                          onClick={() => handleAction(d.riskId, 'acknowledge')}
                          className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                        >
                          Ack
                        </button>
                      )}
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
