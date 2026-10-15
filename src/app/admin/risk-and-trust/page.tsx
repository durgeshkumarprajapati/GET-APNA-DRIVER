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
    if (score >= 75) return 'bg-error/20 text-on-error-container border-error/30';
    if (score >= 50) return 'bg-warning/20 text-on-warning-container border-warning/30';
    if (score >= 25) return 'bg-warning/20 text-on-warning-container border-warning/30';
    return 'bg-primary/20 text-primary border-primary/30';
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-error-container text-on-error-container border border-error/50">
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-warning-container text-on-warning-container border border-warning/50">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-warning-container text-on-warning-container border border-warning/50">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs bg-on-primary-container text-primary border border-primary-container/50">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 bg-surface-container-lowest text-on-surface min-h-screen">
      {/* Header HUD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-high pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Trust, Fraud & Risk Intelligence Engine
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-on-primary-container text-primary border border-primary-container rounded-full">
              Phase 51 Engine
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            Deterministic real-time decision-support layer for platform trust, fraud prevention, and
            account risk.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/operations-command-center"
            className="px-3.5 py-2 text-xs font-medium bg-surface-container-low hover:bg-surface-container-high border border-border rounded-lg text-on-surface transition"
          >
            Operations Command Center →
          </Link>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 bg-error-container/60 border border-error/80 rounded-xl text-on-error-container text-sm"
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl bg-surface-container-low/80 border border-surface-container-high">
          <div className="text-xs font-medium text-on-surface-variant">Total Active Risks</div>
          <div className="text-2xl font-bold text-white mt-1">
            {loading ? '...' : (summary?.totalActiveRisks ?? 0)}
          </div>
          <div className="text-[11px] text-outline mt-1">Evaluated real-time</div>
        </div>
        <div className="p-4 rounded-xl bg-surface-container-low/80 border border-error-container/40">
          <div className="text-xs font-medium text-on-error-container">Critical Severity</div>
          <div className="text-2xl font-bold text-on-error-container mt-1">
            {loading ? '...' : (summary?.criticalRisksCount ?? 0)}
          </div>
          <div className="text-[11px] text-outline mt-1">Score 75–100</div>
        </div>
        <div className="p-4 rounded-xl bg-surface-container-low/80 border border-warning-container/40">
          <div className="text-xs font-medium text-on-warning-container">High Severity</div>
          <div className="text-2xl font-bold text-on-warning-container mt-1">
            {loading ? '...' : (summary?.highRisksCount ?? 0)}
          </div>
          <div className="text-[11px] text-outline mt-1">Score 50–74</div>
        </div>
        <div className="p-4 rounded-xl bg-surface-container-low/80 border border-warning-container/40">
          <div className="text-xs font-medium text-on-warning-container">Medium Severity</div>
          <div className="text-2xl font-bold text-on-warning-container mt-1">
            {loading ? '...' : (summary?.mediumRisksCount ?? 0)}
          </div>
          <div className="text-[11px] text-outline mt-1">Score 25–49</div>
        </div>
        <div className="p-4 rounded-xl bg-surface-container-low/80 border border-info-container/40">
          <div className="text-xs font-medium text-on-info-container">Review Required</div>
          <div className="text-2xl font-bold text-on-info-container mt-1">
            {loading ? '...' : (summary?.reviewRequiredCount ?? 0)}
          </div>
          <div className="text-[11px] text-outline mt-1">Action queue</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="p-4 rounded-xl bg-surface-container-low/90 border border-surface-container-high space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase text-on-surface-variant tracking-wider">
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
                  ? 'bg-primary-container text-white'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-border'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-surface-container-high">
          <input
            type="text"
            placeholder="Search by Risk ID, Subject ID or Risk Type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-surface-container-lowest border border-border rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-container-lowest border border-border rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
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
      <div className="rounded-xl border border-surface-container-high bg-surface-container-low/60 overflow-hidden">
        <div className="p-4 border-b border-surface-container-high flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Active Risk Intelligence Feed</h2>
          <span className="text-xs text-on-surface-variant">
            {decisions.length} records matching criteria
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-on-surface-variant text-sm">
            Loading risk decisions...
          </div>
        ) : decisions.length === 0 ? (
          <div className="p-8 text-center text-outline text-sm">
            No risk records found for selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-on-surface-variant">
              <thead className="bg-surface-container-lowest/80 text-on-surface-variant uppercase text-[10px] tracking-wider border-b border-surface-container-high">
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
              <tbody className="divide-y divide-surface-container-high/60">
                {decisions.map((d) => (
                  <tr key={d.riskId} className="hover:bg-surface-container-high/40 transition">
                    <td className="p-3 font-mono text-[11px] text-on-surface-variant">
                      <Link
                        href={`/admin/risk-and-trust/${d.riskId}`}
                        className="text-primary hover:underline"
                      >
                        {d.riskId}
                      </Link>
                    </td>
                    <td className="p-3 font-medium text-on-surface">
                      {d.subjectName || `${d.subjectType} #${d.subjectId}`}
                      <div className="text-[10px] text-outline">{d.subjectType}</div>
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
                    <td className="p-3 font-mono text-on-surface-variant">{d.riskType}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-container-high text-on-surface-variant">
                        {d.confidence} CONFIDENCE
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container-high text-on-info-container border border-info/40">
                        {d.status}
                      </span>
                    </td>
                    <td
                      className="p-3 max-w-xs truncate text-on-surface-variant text-[11px]"
                      title={d.evidence.why}
                    >
                      {d.evidence.evidenceItems[0] || d.evidence.why}
                    </td>
                    <td className="p-3 text-right space-x-1.5">
                      <Link
                        href={`/admin/risk-and-trust/${d.riskId}`}
                        className="px-2.5 py-1 text-[11px] bg-on-primary-container text-primary border border-primary-container rounded hover:bg-on-primary-container transition inline-block"
                      >
                        Inspect
                      </Link>
                      {d.status !== 'ACKNOWLEDGED' && (
                        <button
                          onClick={() => handleAction(d.riskId, 'acknowledge')}
                          className="px-2 py-1 text-[11px] bg-surface-container-high hover:bg-border text-on-surface-variant rounded transition"
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
