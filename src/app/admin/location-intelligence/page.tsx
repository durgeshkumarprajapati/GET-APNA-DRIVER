'use client';

import { useEffect, useState } from 'react';

interface LocationIntelligenceSummary {
  telemetry: {
    etaRequestCount: number;
    etaSuccessCount: number;
    etaFailureCount: number;
    providerCounts: Record<string, number>;
    staleCount: number;
    anomalyCount: number;
  };
  totalCurrentDrivers: number;
  activeBookingsWithDriver: number;
  healthStatus: string;
  timestamp: string;
}

export default function AdminLocationIntelligencePage() {
  const [summary, setSummary] = useState<LocationIntelligenceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetch('/api/admin/location-intelligence');
        if (!res.ok) {
          throw new Error('Failed to load operational location intelligence');
        }
        const data = await res.json();
        setSummary(data.summary);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading location intelligence');
      } finally {
        setLoading(false);
      }
    }
    void loadSummary();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-primary uppercase">
            OPERATIONAL INTELLIGENCE
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface font-['Space_Grotesk'] mt-1">
            Location Intelligence & Routing
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Real-time telemetry, ETA provider health, stale location counts, and geofence activity.
          </p>
        </div>

        {summary && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-surface-container-high text-xs font-mono">
            <span className="text-outline">Engine Health:</span>
            <span
              className={`font-bold uppercase ${
                summary.healthStatus === 'HEALTHY' ? 'text-primary' : 'text-on-warning-container'
              }`}
            >
              ● {summary.healthStatus}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error-container/50 border border-error/50 text-on-error-container text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-on-surface-variant text-sm font-mono animate-pulse">
          Loading operational location telemetry…
        </div>
      ) : (
        summary && (
          <div className="space-y-6">
            {/* METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                    Active Drivers Live
                  </span>
                  <span className="material-symbols-outlined text-primary">my_location</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-primary font-['Space_Grotesk']">
                  {summary.totalCurrentDrivers}
                </div>
                <p className="text-[11px] text-outline font-mono">
                  Drivers with active GPS telemetry
                </p>
              </div>

              <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                    Active Tracking Bookings
                  </span>
                  <span className="material-symbols-outlined text-primary">directions_car</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface font-['Space_Grotesk']">
                  {summary.activeBookingsWithDriver}
                </div>
                <p className="text-[11px] text-outline font-mono">
                  Ongoing bookings with live location
                </p>
              </div>

              <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                    ETA Requests
                  </span>
                  <span className="material-symbols-outlined text-primary">route</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface font-['Space_Grotesk']">
                  {summary.telemetry.etaRequestCount}
                </div>
                <p className="text-[11px] text-outline font-mono">
                  Success rate:{' '}
                  {summary.telemetry.etaRequestCount > 0
                    ? `${Math.round(
                        (summary.telemetry.etaSuccessCount / summary.telemetry.etaRequestCount) *
                          100,
                      )}%`
                    : '100%'}
                </p>
              </div>

              <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                    Stale Telemetry
                  </span>
                  <span className="material-symbols-outlined text-on-warning-container">
                    timer_off
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-on-warning-container font-['Space_Grotesk']">
                  {summary.telemetry.staleCount}
                </div>
                <p className="text-[11px] text-outline font-mono">Telemetry age &gt; 120 seconds</p>
              </div>
            </div>

            {/* PROVIDER BREAKDOWN */}
            <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-6 shadow-xl space-y-4 font-mono text-xs">
              <h3 className="text-base font-bold text-on-surface font-['Space_Grotesk'] border-b border-surface-container-high pb-3">
                ETA Routing Provider Execution Breakdown
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container-high space-y-1">
                  <span className="text-[10px] uppercase text-outline block font-bold">
                    Google Routing (Primary)
                  </span>
                  <div className="text-xl font-bold text-primary">
                    {summary.telemetry.providerCounts.GOOGLE || 0} calls
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container-high space-y-1">
                  <span className="text-[10px] uppercase text-outline block font-bold">
                    Mapbox Routing (Fallback)
                  </span>
                  <div className="text-xl font-bold text-on-surface">
                    {summary.telemetry.providerCounts.MAPBOX || 0} calls
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container-high space-y-1">
                  <span className="text-[10px] uppercase text-outline block font-bold">
                    Deterministic Fallback
                  </span>
                  <div className="text-xl font-bold text-on-warning-container">
                    {summary.telemetry.providerCounts.DETERMINISTIC_FALLBACK || 0} calls
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
