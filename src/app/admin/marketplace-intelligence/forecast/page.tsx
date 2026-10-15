'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/marketplace-intelligence"
          className="inline-flex items-center text-xs font-semibold text-on-surface-variant hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-sm mr-1">arrow_back</span> Back to Console
        </Link>

        <div className="flex items-center space-x-2">
          {(['30m', '1h', '2h', '4h'] as const).map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono border transition-all ${
                horizon === h
                  ? 'bg-info/10 text-on-info-container border-info/30'
                  : 'bg-surface-container-low text-on-surface-variant border-surface-container-high hover:text-on-surface'
              }`}
            >
              {h} HORIZON
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface-container-low border border-surface-container-high p-6 rounded-2xl shadow-xl space-y-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-2xl text-on-info-container">
              schedule
            </span>
            <h2 className="text-xl font-bold text-white">Demand Forecast Analysis</h2>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Historical baseline forecast model ({data?.modelVersion || 'baseline-v1'})
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-on-surface-variant text-sm">
            Loading forecast models...
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-high">
                <span className="text-xs text-on-surface-variant block mb-1">
                  Forecasted Total Demand
                </span>
                <span className="text-3xl font-bold font-mono text-on-info-container">
                  {data.forecastedDemand}
                </span>
                <span className="text-xs text-on-surface-variant block mt-1">
                  expected bookings
                </span>
              </div>

              <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-high">
                <span className="text-xs text-on-surface-variant block mb-1">
                  Organic Demand Baseline
                </span>
                <span className="text-3xl font-bold font-mono text-on-surface">
                  {data.expectedOrganicDemand}
                </span>
                <span className="text-xs text-on-surface-variant block mt-1">
                  historical baseline
                </span>
              </div>

              <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-high">
                <span className="text-xs text-on-surface-variant block mb-1">
                  Known Scheduled Bookings
                </span>
                <span className="text-3xl font-bold font-mono text-on-suspend-container">
                  {data.knownScheduledDemand}
                </span>
                <span className="text-xs text-on-surface-variant block mt-1">
                  pre-booked occurrences
                </span>
              </div>
            </div>

            <div className="p-4 bg-surface-container-lowest rounded-xl border border-surface-container-high flex items-start space-x-3">
              <span className="material-symbols-outlined text-xl text-primary shrink-0 mt-0.5">
                verified
              </span>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-on-surface">Forecast Explanation</h4>
                <p className="text-xs text-on-surface-variant">{data.explanation}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
