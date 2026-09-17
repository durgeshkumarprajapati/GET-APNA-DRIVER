'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { PageHeader } from '@/components/ui/page-header';

interface ExperienceMetricsData {
  totalGenerated: number;
  totalDismissed: number;
  latencyMs: number;
  rulesExecutedCount: number;
  errorCount: number;
  lastGeneratedAt: string;
  generatedByType: Record<string, number>;
  generatedByCategory: Record<string, number>;
  dismissalsByType: Record<string, number>;
}

export default function AdminExperienceOrchestrationPage() {
  const [metrics, setMetrics] = useState<ExperienceMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/experience/metrics');
      const data = await res.json();
      if (res.ok && data.success) {
        setMetrics(data.metrics);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch experience metrics');
      }
    } catch {
      setError('Network error fetching telemetry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/experience/metrics')
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          if (data.success) {
            setMetrics(data.metrics);
            setError(null);
          } else {
            setError(data.error || 'Failed to fetch experience metrics');
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError('Network error fetching telemetry');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminLayout>
      <div className="flex flex-col w-full gap-4 text-[#dfe2ee]">
        <PageHeader
          eyebrow="PLATFORM INTELLIGENCE & EXPERIENCE ENGINE"
          title="Intelligent Experience Orchestration Console"
          subtitle="Real-time telemetry, signal-driven recommendations, rule execution rates, and persistent user dismissals."
          actions={
            <button
              type="button"
              onClick={() => void fetchMetrics()}
              className="px-3 py-1.5 rounded-lg bg-[#25a475] hover:bg-[#208f66] text-[#00311f] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span>Refresh Telemetry</span>
            </button>
          }
        />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-[#181c24]/50 border border-[#262a33] animate-pulse p-4"
              />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
            {error}
          </div>
        ) : metrics ? (
          <>
            {/* Telemetry Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] space-y-1">
                <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                  Total Recommendations Generated
                </span>
                <div className="text-2xl font-bold text-[#68dba9] font-['Space_Grotesk']">
                  {metrics.totalGenerated.toLocaleString()}
                </div>
                <span className="text-[9.5px] text-[#bccac0]">
                  Across customer & driver signals
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] space-y-1">
                <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                  Avg Generation Latency
                </span>
                <div className="text-2xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] font-mono">
                  {metrics.latencyMs} ms
                </div>
                <span className="text-[9.5px] text-[#68dba9]">Parallel context evaluation</span>
              </div>

              <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] space-y-1">
                <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                  Rules Executed
                </span>
                <div className="text-2xl font-bold text-indigo-400 font-['Space_Grotesk'] font-mono">
                  {metrics.rulesExecutedCount.toLocaleString()}
                </div>
                <span className="text-[9.5px] text-[#bccac0]">Deterministic rule evaluations</span>
              </div>

              <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] space-y-1">
                <span className="text-[10px] font-bold text-[#87948b] uppercase tracking-wider font-['Space_Grotesk']">
                  Total Dismissals
                </span>
                <div className="text-2xl font-bold text-amber-400 font-['Space_Grotesk'] font-mono">
                  {metrics.totalDismissed.toLocaleString()}
                </div>
                <span className="text-[9.5px] text-[#bccac0]">Persisted user preferences</span>
              </div>
            </div>

            {/* Generated by Category & Type Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] space-y-3">
                <div className="flex items-center justify-between border-b border-[#262a33] pb-2">
                  <h3 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                    Recommendations by Experience Type
                  </h3>
                  <span className="text-[10px] font-mono text-[#68dba9]">Live Telemetry</span>
                </div>
                <div className="space-y-2">
                  {Object.keys(metrics.generatedByType).length === 0 ? (
                    <p className="text-xs text-[#87948b] italic">
                      No recommendations recorded yet.
                    </p>
                  ) : (
                    Object.entries(metrics.generatedByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-[#bccac0] text-[11px]">{type}</span>
                        <span className="font-mono font-bold text-[#68dba9]">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#181c24] border border-[#262a33] space-y-3">
                <div className="flex items-center justify-between border-b border-[#262a33] pb-2">
                  <h3 className="font-bold text-sm text-[#dfe2ee] font-['Space_Grotesk']">
                    Dismissals by Experience Type
                  </h3>
                  <span className="text-[10px] font-mono text-amber-400">Database Persistence</span>
                </div>
                <div className="space-y-2">
                  {Object.keys(metrics.dismissalsByType).length === 0 ? (
                    <p className="text-xs text-[#87948b] italic">No dismissals recorded yet.</p>
                  ) : (
                    Object.entries(metrics.dismissalsByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-[#bccac0] text-[11px]">{type}</span>
                        <span className="font-mono font-bold text-amber-400">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}
