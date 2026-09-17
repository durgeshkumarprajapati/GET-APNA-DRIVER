'use client';

import { useEffect, useState } from 'react';

import { useTranslation } from '@/i18n/context';
import { ObservabilityNav } from '../_components/observability-nav';

interface SloReport {
  serviceName: string;
  sliName: string;
  targetPercent: number;
  actualPercent: number;
  isCompliant: boolean;
  errorBudgetRemainingPercent: number;
  timeframe: string;
}

interface IncidentReport {
  incidentId: string;
  detectedAt: string;
  primaryAlert: {
    alertName: string;
    severity: string;
    description: string;
  };
  suspectedRootCauses: Array<{
    component: string;
    reason: string;
    confidence: number;
  }>;
  recommendedActions: string[];
}

export default function ReliabilityPage() {
  const { t } = useTranslation();
  const [slos, setSlos] = useState<SloReport[]>([]);
  const [incident, setIncident] = useState<IncidentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/platform-health/reliability')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setSlos(json.data.slos || []);
          setIncident(json.data.incidentCorrelation);
        } else {
          setError(json.message);
        }
      })
      .catch(() => setError('Failed to fetch reliability metrics'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {t('platformHealth.navReliability') || 'Service Level Objectives & Incident Correlation'}
        </h1>
        <p className="text-sm text-gray-500">
          {t('platformHealth.reliabilitySubtitle') ||
            'SLO compliance targets, error budgets & automated root cause analysis'}
        </p>
      </div>

      <ObservabilityNav />

      {error && <div className="p-4 mb-6 bg-rose-100 text-rose-800 rounded">{error}</div>}

      {loading ? (
        <div className="p-8 text-center text-gray-500">
          Evaluating SLO compliance and active incidents...
        </div>
      ) : (
        <div className="space-y-6">
          {incident && (
            <div className="p-6 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                    Active Incident Detected
                  </span>
                  <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 mt-1">
                    {incident.incidentId} - {incident.primaryAlert.alertName}
                  </h3>
                </div>
                <span className="px-2 py-1 text-xs font-bold bg-amber-600 text-white rounded">
                  CORRELATED
                </span>
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                {incident.primaryAlert.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white dark:bg-gray-800 p-3 rounded border border-amber-200 dark:border-amber-800">
                  <h4 className="font-bold mb-2 text-gray-700 dark:text-gray-300">
                    Suspected Root Causes
                  </h4>
                  {incident.suspectedRootCauses.map((rc, idx) => (
                    <div key={idx} className="mb-1">
                      <strong>{rc.component}</strong>: {rc.reason} (
                      {Math.round(rc.confidence * 100)}% confidence)
                    </div>
                  ))}
                </div>

                <div className="bg-white dark:bg-gray-800 p-3 rounded border border-amber-200 dark:border-amber-800">
                  <h4 className="font-bold mb-2 text-gray-700 dark:text-gray-300">
                    Recommended Actions
                  </h4>
                  <ul className="list-disc pl-4 space-y-1">
                    {incident.recommendedActions.map((act, idx) => (
                      <li key={idx}>{act}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-bold mb-4">Service Level Objectives (SLOs)</h3>
            <div className="space-y-4">
              {slos.map((slo, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{slo.serviceName}</span>
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded ${slo.isCompliant ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'}`}
                      >
                        {slo.isCompliant ? 'COMPLIANT' : 'BREACHED'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{slo.sliName}</p>
                  </div>

                  <div className="flex items-center gap-6 text-xs">
                    <div>
                      <span className="text-gray-500 block">Target / Actual</span>
                      <span className="font-bold">
                        {slo.targetPercent}% / {slo.actualPercent}%
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block">Error Budget Remaining</span>
                      <span
                        className={`font-bold ${slo.errorBudgetRemainingPercent > 50 ? 'text-emerald-600' : slo.errorBudgetRemainingPercent > 20 ? 'text-amber-600' : 'text-rose-600'}`}
                      >
                        {slo.errorBudgetRemainingPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
