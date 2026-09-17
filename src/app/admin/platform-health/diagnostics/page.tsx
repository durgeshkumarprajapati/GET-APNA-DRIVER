'use client';

import { useState } from 'react';

import { useTranslation } from '@/i18n/context';
import { ObservabilityNav } from '../_components/observability-nav';

export default function DiagnosticsPage() {
  const { t } = useTranslation();
  const [dbResult, setDbResult] = useState<unknown | null>(null);
  const [redisResult, setRedisResult] = useState<unknown | null>(null);
  const [workerResult, setWorkerResult] = useState<unknown | null>(null);

  const [running, setRunning] = useState<string | null>(null);

  const runDiagnostic = async (type: 'database' | 'redis' | 'workers') => {
    setRunning(type);
    try {
      const res = await fetch(`/api/admin/platform-health/diagnostics/${type}`, { method: 'POST' });
      const json = await res.json();
      if (type === 'database') setDbResult(json.data);
      if (type === 'redis') setRedisResult(json.data);
      if (type === 'workers') setWorkerResult(json.data);
    } catch {
      alert(`Failed to run ${type} diagnostics`);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {t('platformHealth.navDiagnostics') || 'Platform Diagnostic Tools'}
        </h1>
        <p className="text-sm text-gray-500">
          {t('platformHealth.diagnosticsSubtitle') ||
            'On-demand read-only diagnostic inspection for Database, Redis & Worker subsystem'}
        </p>
      </div>

      <ObservabilityNav />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Database Diagnostic Tool */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg mb-2">Database Inspector</h3>
            <p className="text-xs text-gray-500 mb-4">
              Inspect connection pool status, table row counts & query latency.
            </p>
          </div>
          <div>
            <button
              onClick={() => runDiagnostic('database')}
              disabled={running === 'database'}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium text-sm transition-colors disabled:opacity-50"
            >
              {running === 'database' ? 'Running Inspection...' : 'Run Database Diagnostic'}
            </button>
            {dbResult !== null && (
              <pre className="mt-4 p-3 bg-gray-900 text-gray-100 text-xs rounded max-h-60 overflow-y-auto">
                {JSON.stringify(dbResult, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Redis Diagnostic Tool */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg mb-2">Redis & Cache Inspector</h3>
            <p className="text-xs text-gray-500 mb-4">
              Inspect memory usage, hit rate percentage, ping latency & client count.
            </p>
          </div>
          <div>
            <button
              onClick={() => runDiagnostic('redis')}
              disabled={running === 'redis'}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium text-sm transition-colors disabled:opacity-50"
            >
              {running === 'redis' ? 'Running Inspection...' : 'Run Redis Diagnostic'}
            </button>
            {redisResult !== null && (
              <pre className="mt-4 p-3 bg-gray-900 text-gray-100 text-xs rounded max-h-60 overflow-y-auto">
                {JSON.stringify(redisResult, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Worker Diagnostic Tool */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg mb-2">Worker & Outbox Inspector</h3>
            <p className="text-xs text-gray-500 mb-4">
              Inspect outbox pending counts, queue lag & worker heartbeat status.
            </p>
          </div>
          <div>
            <button
              onClick={() => runDiagnostic('workers')}
              disabled={running === 'workers'}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium text-sm transition-colors disabled:opacity-50"
            >
              {running === 'workers' ? 'Running Inspection...' : 'Run Worker Diagnostic'}
            </button>
            {workerResult !== null && (
              <pre className="mt-4 p-3 bg-gray-900 text-gray-100 text-xs rounded max-h-60 overflow-y-auto">
                {JSON.stringify(workerResult, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
