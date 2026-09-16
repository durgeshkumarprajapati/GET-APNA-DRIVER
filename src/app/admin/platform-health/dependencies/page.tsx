'use client';

import { useEffect, useState } from 'react';

import { useTranslation } from '@/i18n/context';
import { ObservabilityNav } from '../_components/observability-nav';

interface Dependency {
  name: string;
  type: string;
  status: string;
  latencyMs: number;
  lastChecked: string;
  details?: Record<string, unknown>;
}

export default function DependenciesHealthPage() {
  const { t } = useTranslation();
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/platform-health/dependencies')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setDependencies(json.data.dependencies || []);
        } else {
          setError(json.message);
        }
      })
      .catch(() => setError('Failed to fetch dependency health'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {t('platformHealth.navDependencies') || 'External Dependencies Health'}
        </h1>
        <p className="text-sm text-gray-500">
          {t('platformHealth.dependenciesSubtitle') ||
            'Google Maps, Payment Gateways & Notification Infrastructure'}
        </p>
      </div>

      <ObservabilityNav />

      {error && <div className="p-4 mb-6 bg-rose-100 text-rose-800 rounded">{error}</div>}

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading dependency health...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dependencies.map((dep, idx) => (
            <div
              key={idx}
              className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-base">{dep.name}</h3>
                  <span className="text-xs text-gray-500">Type: {dep.type}</span>
                </div>
                <span className="px-2 py-1 text-xs font-bold rounded bg-emerald-500 text-white">
                  {dep.status}
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                <div>Latency: {dep.latencyMs} ms</div>
                <div>Last Checked: {new Date(dep.lastChecked).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
