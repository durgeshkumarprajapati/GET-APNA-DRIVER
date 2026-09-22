'use client';

import { useEffect, useState } from 'react';

import { useTranslation } from '@/i18n/context';
import { ObservabilityNav } from '../_components/observability-nav';

interface PerformanceData {
  count: number;
  errorCount: number;
  avgDurationMs: number;
  errorRatePercent: number;
  buckets: Array<{
    id: string;
    bucketStart: string;
    count: number;
    errorCount: number;
    totalDurationMs: number;
  }>;
}

export default function PerformanceMetricsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/platform-health/performance?hours=24')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.message);
        }
      })
      .catch(() => setError('Failed to fetch performance metrics'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {t('platformHealth.navPerformance') || 'Performance & Telemetry Metrics'}
        </h1>
        <p className="text-sm text-gray-500">
          {t('platformHealth.performanceSubtitle') ||
            '24-Hour throughput, response latency distributions & error rates'}
        </p>
      </div>

      <ObservabilityNav />

      {error && <div className="p-4 mb-6 bg-rose-100 text-rose-800 rounded">{error}</div>}

      {loading || !data ? (
        <div className="p-8 text-center text-gray-500">
          Loading performance metric aggregates...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500">Total API Requests (24h)</span>
              <div className="text-3xl font-bold mt-1">{data.count}</div>
            </div>
            <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500">Avg Response Latency</span>
              <div className="text-3xl font-bold mt-1 text-indigo-600">{data.avgDurationMs} ms</div>
            </div>
            <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500">Error Count</span>
              <div className="text-3xl font-bold mt-1 text-rose-600">{data.errorCount}</div>
            </div>
            <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500">Error Rate</span>
              <div className="text-3xl font-bold mt-1 text-amber-600">{data.errorRatePercent}%</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-bold mb-4">Aggregated Metric Buckets (Recent)</h3>
            {data.buckets.length === 0 ? (
              <p className="text-sm text-gray-500">
                No telemetry buckets recorded in the selected window.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {data.buckets
                  .slice(-20)
                  .reverse()
                  .map((b) => (
                    <div
                      key={b.id}
                      className="p-3 bg-gray-50 dark:bg-gray-900 rounded flex flex-wrap justify-between items-center gap-2 text-xs"
                    >
                      <div>{new Date(b.bucketStart).toLocaleString()}</div>
                      <div className="flex flex-wrap gap-4">
                        <span>
                          Requests: <strong>{b.count}</strong>
                        </span>
                        <span>
                          Errors: <strong className="text-rose-600">{b.errorCount}</strong>
                        </span>
                        <span>
                          Total Time: <strong>{Math.round(b.totalDurationMs)}ms</strong>
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
