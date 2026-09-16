'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin-layout';

interface ForecastData {
  modelVersion: string;
  forecastedDemand: number;
  expectedOrganicDemand: number;
  knownScheduledDemand: number;
  explanation: string;
  confidence: string;
}

export default function AdminForecastPage() {
  const [horizon, setHorizon] = useState<'30m' | '1h' | '2h' | '4h'>('1h');
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/marketplace-intelligence/forecast?horizon=${horizon}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Forecast fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, [horizon]);

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <Link
            href="/admin/marketplace-intelligence"
            className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-sm mr-1">arrow_back</span> Back to
            Console
          </Link>

          <div className="flex items-center space-x-2">
            {(['30m', '1h', '2h', '4h'] as const).map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono border transition-all ${
                  horizon === h
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {h} HORIZON
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-2xl text-blue-400">schedule</span>
              <h2 className="text-xl font-bold text-white">Demand Forecast Analysis</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Historical baseline forecast model ({data?.modelVersion || 'baseline-v1'})
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading forecast models...</div>
          ) : data ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Forecasted Total Demand</span>
                  <span className="text-3xl font-bold font-mono text-blue-400">
                    {data.forecastedDemand}
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">expected rides</span>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Organic Demand Baseline</span>
                  <span className="text-3xl font-bold font-mono text-slate-200">
                    {data.expectedOrganicDemand}
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">historical baseline</span>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Known Scheduled Rides</span>
                  <span className="text-3xl font-bold font-mono text-purple-400">
                    {data.knownScheduledDemand}
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">pre-booked occurrences</span>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-start space-x-3">
                <span className="material-symbols-outlined text-xl text-emerald-400 shrink-0 mt-0.5">
                  verified
                </span>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-200">Forecast Explanation</h4>
                  <p className="text-xs text-slate-400">{data.explanation}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AdminLayout>
  );
}
