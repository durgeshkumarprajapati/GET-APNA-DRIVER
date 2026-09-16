'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/context';
import { ObservabilityNav } from './_components/observability-nav';

interface HealthData {
  overallScore: number;
  overallStatus: string;
  timestamp: string;
  activeAlertCount: number;
  criticalAlertCount: number;
  components: Record<
    string,
    {
      name: string;
      category: string;
      status: string;
      score: number;
      weight: number;
      latencyMs?: number;
      errorRatePercent?: number;
    }
  >;
}

export default function PlatformHealthOverviewPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/admin/platform-health');
        const json = await res.json();
        if (isMounted) {
          if (json.success) {
            setData(json.data);
            setError(null);
          } else {
            setError(json.message || 'Failed to fetch platform health');
          }
        }
      } catch {
        if (isMounted) setError('Network error loading platform health');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchHealth();
    if (!autoRefresh)
      return () => {
        isMounted = false;
      };
    const interval = setInterval(fetchHealth, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [autoRefresh, refreshTrigger]);

  const handleManualRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return 'bg-emerald-500 text-white';
      case 'DEGRADED':
        return 'bg-blue-500 text-white';
      case 'WARNING':
        return 'bg-amber-500 text-white';
      case 'CRITICAL':
        return 'bg-rose-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 75) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('platformHealth.title') || 'Platform SRE Observability & Control Plane'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('platformHealth.subtitle') ||
              'Real-time deterministic system state, component matrix & operational metrics'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            {t('platformHealth.autoRefresh10s') || 'Auto-refresh (10s)'}
          </label>
          <button
            onClick={handleManualRefresh}
            className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
          >
            {t('platformHealth.refreshNow') || 'Refresh'}
          </button>
        </div>
      </div>

      <ObservabilityNav />

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-200 text-sm">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="p-12 text-center text-gray-500">
          {t('platformHealth.loading') || 'Evaluating platform metrics...'}
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t('platformHealth.overallScore') || 'Platform Health Score'}
              </span>
              <div
                className={`text-4xl font-extrabold mt-2 ${getScoreBadgeColor(data.overallScore)}`}
              >
                {data.overallScore} / 100
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t('platformHealth.overallStatus') || 'Overall Status'}
              </span>
              <div className="mt-2">
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(data.overallStatus)}`}
                >
                  {data.overallStatus}
                </span>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t('platformHealth.activeAlerts') || 'Active Alerts'}
              </span>
              <div className="text-3xl font-bold mt-2 text-amber-600 dark:text-amber-400">
                {data.activeAlertCount}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t('platformHealth.criticalAlerts') || 'Critical Alerts'}
              </span>
              <div className="text-3xl font-bold mt-2 text-rose-600 dark:text-rose-400">
                {data.criticalAlertCount}
              </div>
            </div>
          </div>

          {/* Component Matrix Grid */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">
              {t('platformHealth.componentHealthMatrix') || 'Component Health Matrix'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(data.components).map(([key, comp]) => (
                <div
                  key={key}
                  className="p-4 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{comp.name}</span>
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded ${getStatusColor(comp.status)}`}
                      >
                        {comp.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1 mt-1">
                      <div>Category: {comp.category}</div>
                      <div>Weight: {Math.round(comp.weight * 100)}%</div>
                      {comp.latencyMs !== undefined && <div>Latency: {comp.latencyMs}ms</div>}
                      {comp.errorRatePercent !== undefined && (
                        <div>Error Rate: {comp.errorRatePercent}%</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs">
                    <span className="text-gray-500">Score</span>
                    <span className="font-bold">{comp.score}/100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
