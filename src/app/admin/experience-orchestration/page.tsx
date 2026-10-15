'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

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
    <div className="flex flex-col w-full gap-4 text-on-surface">
      <PageHeader
        eyebrow="PLATFORM INTELLIGENCE & EXPERIENCE ENGINE"
        title="Intelligent Experience Orchestration Console"
        subtitle="Real-time telemetry, signal-driven recommendations, rule execution rates, and persistent user dismissals."
        actions={
          <button
            type="button"
            onClick={() => void fetchMetrics()}
            className="px-3 py-1.5 rounded-lg bg-primary-container hover:bg-primary-container text-on-primary-container text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md"
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
              className="h-24 rounded-xl bg-surface-container-low/50 border border-surface-container-high animate-pulse p-4"
            />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-error-container/40 border border-error text-on-error-container text-xs">
          {error}
        </div>
      ) : metrics ? (
        <>
          {/* Telemetry Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high space-y-1">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider font-['Space_Grotesk']">
                Total Recommendations Generated
              </span>
              <div className="text-2xl font-bold text-primary font-['Space_Grotesk']">
                {metrics.totalGenerated.toLocaleString()}
              </div>
              <span className="text-[9.5px] text-on-surface-variant">
                Across customer & driver signals
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high space-y-1">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider font-['Space_Grotesk']">
                Avg Generation Latency
              </span>
              <div className="text-2xl font-bold text-on-surface font-['Space_Grotesk'] font-mono">
                {metrics.latencyMs} ms
              </div>
              <span className="text-[9.5px] text-primary">Parallel context evaluation</span>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high space-y-1">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider font-['Space_Grotesk']">
                Rules Executed
              </span>
              <div className="text-2xl font-bold text-on-info-container font-['Space_Grotesk'] font-mono">
                {metrics.rulesExecutedCount.toLocaleString()}
              </div>
              <span className="text-[9.5px] text-on-surface-variant">
                Deterministic rule evaluations
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high space-y-1">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider font-['Space_Grotesk']">
                Total Dismissals
              </span>
              <div className="text-2xl font-bold text-on-warning-container font-['Space_Grotesk'] font-mono">
                {metrics.totalDismissed.toLocaleString()}
              </div>
              <span className="text-[9.5px] text-on-surface-variant">
                Persisted user preferences
              </span>
            </div>
          </div>

          {/* Generated by Category & Type Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high space-y-3">
              <div className="flex items-center justify-between border-b border-surface-container-high pb-2">
                <h3 className="font-bold text-sm text-on-surface font-['Space_Grotesk']">
                  Recommendations by Experience Type
                </h3>
                <span className="text-[10px] font-mono text-primary">Live Telemetry</span>
              </div>
              <div className="space-y-2">
                {Object.keys(metrics.generatedByType).length === 0 ? (
                  <EmptyState icon="insights" message="No recommendations recorded yet." />
                ) : (
                  Object.entries(metrics.generatedByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-on-surface-variant text-[11px]">{type}</span>
                      <span className="font-mono font-bold text-primary">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high space-y-3">
              <div className="flex items-center justify-between border-b border-surface-container-high pb-2">
                <h3 className="font-bold text-sm text-on-surface font-['Space_Grotesk']">
                  Dismissals by Experience Type
                </h3>
                <span className="text-[10px] font-mono text-on-warning-container">
                  Database Persistence
                </span>
              </div>
              <div className="space-y-2">
                {Object.keys(metrics.dismissalsByType).length === 0 ? (
                  <EmptyState icon="block" message="No dismissals recorded yet." />
                ) : (
                  Object.entries(metrics.dismissalsByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-on-surface-variant text-[11px]">{type}</span>
                      <span className="font-mono font-bold text-on-warning-container">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
