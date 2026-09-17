'use client';

import { useEffect, useState } from 'react';

import { useTranslation } from '@/i18n/context';
import { ObservabilityNav } from '../_components/observability-nav';

interface WorkerData {
  timestamp: string;
  status: string;
  outboxStats: {
    pendingCount: number;
    processingCount: number;
    failedCount: number;
    completed24hCount: number;
    oldestPendingAgeSeconds: number;
  };
  queueStats: Array<{
    queueName: string;
    waitingCount: number;
    activeCount: number;
    failedCount: number;
  }>;
  notes: string[];
}

export default function WorkerHealthPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<WorkerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/platform-health/workers')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.message);
        }
      })
      .catch(() => setError('Failed to fetch worker health'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {t('platformHealth.navWorkers') || 'Workers & Outbox Pipeline Health'}
        </h1>
        <p className="text-sm text-gray-500">
          {t('platformHealth.workersSubtitle') ||
            'Asynchronous event queues, outbox lag & queue worker status'}
        </p>
      </div>

      <ObservabilityNav />

      {error && <div className="p-4 mb-6 bg-rose-100 text-rose-800 rounded">{error}</div>}

      {loading || !data ? (
        <div className="p-8 text-center text-gray-500">Loading worker pipeline telemetry...</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500">Pending Outbox Events</span>
              <div className="text-3xl font-bold mt-1">{data.outboxStats.pendingCount}</div>
            </div>
            <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500">Processing Events</span>
              <div className="text-3xl font-bold mt-1 text-blue-600">
                {data.outboxStats.processingCount}
              </div>
            </div>
            <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500">Failed Events</span>
              <div className="text-3xl font-bold mt-1 text-rose-600">
                {data.outboxStats.failedCount}
              </div>
            </div>
            <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500">Oldest Pending Lag</span>
              <div className="text-3xl font-bold mt-1 text-amber-600">
                {data.outboxStats.oldestPendingAgeSeconds}s
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-bold mb-4">Background Queues</h3>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2">Queue Name</th>
                  <th className="pb-2">Waiting</th>
                  <th className="pb-2">Active</th>
                  <th className="pb-2">Failed</th>
                </tr>
              </thead>
              <tbody>
                {data.queueStats.map((q, idx) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2.5 font-medium">{q.queueName}</td>
                    <td className="py-2.5">{q.waitingCount}</td>
                    <td className="py-2.5">{q.activeCount}</td>
                    <td className="py-2.5 text-rose-600 font-bold">{q.failedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
