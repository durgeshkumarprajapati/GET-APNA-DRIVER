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
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#68dba9] uppercase">
            OPERATIONAL INTELLIGENCE
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
            Location Intelligence & Routing
          </h1>
          <p className="text-xs sm:text-sm text-[#bccac0] mt-1">
            Real-time telemetry, ETA provider health, stale location counts, and geofence activity.
          </p>
        </div>

        {summary && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141822] border border-[#262a33] text-xs font-mono">
            <span className="text-[#87948b]">Engine Health:</span>
            <span
              className={`font-bold uppercase ${
                summary.healthStatus === 'HEALTHY' ? 'text-[#68dba9]' : 'text-amber-400'
              }`}
            >
              ● {summary.healthStatus}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-[#bccac0] text-sm font-mono animate-pulse">
          Loading operational location telemetry…
        </div>
      ) : (
        summary && (
          <div className="space-y-6">
            {/* METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#141822] border border-[#262a33] rounded-2xl p-5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-[#bccac0]">
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                    Active Drivers Live
                  </span>
                  <span className="material-symbols-outlined text-[#68dba9]">my_location</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#68dba9] font-['Space_Grotesk']">
                  {summary.totalCurrentDrivers}
                </div>
                <p className="text-[11px] text-[#87948b] font-mono">
                  Drivers with active GPS telemetry
                </p>
              </div>

              <div className="bg-[#141822] border border-[#262a33] rounded-2xl p-5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-[#bccac0]">
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                    Active Tracking Bookings
                  </span>
                  <span className="material-symbols-outlined text-[#68dba9]">directions_car</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#dfe2ee] font-['Space_Grotesk']">
                  {summary.activeBookingsWithDriver}
                </div>
                <p className="text-[11px] text-[#87948b] font-mono">
                  Ongoing bookings with live location
                </p>
              </div>

              <div className="bg-[#141822] border border-[#262a33] rounded-2xl p-5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-[#bccac0]">
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                    ETA Requests
                  </span>
                  <span className="material-symbols-outlined text-[#68dba9]">route</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#dfe2ee] font-['Space_Grotesk']">
                  {summary.telemetry.etaRequestCount}
                </div>
                <p className="text-[11px] text-[#87948b] font-mono">
                  Success rate:{' '}
                  {summary.telemetry.etaRequestCount > 0
                    ? `${Math.round(
                        (summary.telemetry.etaSuccessCount / summary.telemetry.etaRequestCount) *
                          100,
                      )}%`
                    : '100%'}
                </p>
              </div>

              <div className="bg-[#141822] border border-[#262a33] rounded-2xl p-5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-[#bccac0]">
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                    Stale Telemetry
                  </span>
                  <span className="material-symbols-outlined text-amber-400">timer_off</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-['Space_Grotesk']">
                  {summary.telemetry.staleCount}
                </div>
                <p className="text-[11px] text-[#87948b] font-mono">
                  Telemetry age &gt; 120 seconds
                </p>
              </div>
            </div>

            {/* PROVIDER BREAKDOWN */}
            <div className="bg-[#141822] border border-[#262a33] rounded-2xl p-6 shadow-xl space-y-4 font-mono text-xs">
              <h3 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk'] border-b border-[#262a33] pb-3">
                ETA Routing Provider Execution Breakdown
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#0a0e16] border border-[#262a33] space-y-1">
                  <span className="text-[10px] uppercase text-[#87948b] block font-bold">
                    Google Routing (Primary)
                  </span>
                  <div className="text-xl font-bold text-[#68dba9]">
                    {summary.telemetry.providerCounts.GOOGLE || 0} calls
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0a0e16] border border-[#262a33] space-y-1">
                  <span className="text-[10px] uppercase text-[#87948b] block font-bold">
                    Mapbox Routing (Fallback)
                  </span>
                  <div className="text-xl font-bold text-[#dfe2ee]">
                    {summary.telemetry.providerCounts.MAPBOX || 0} calls
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0a0e16] border border-[#262a33] space-y-1">
                  <span className="text-[10px] uppercase text-[#87948b] block font-bold">
                    Deterministic Fallback
                  </span>
                  <div className="text-xl font-bold text-amber-400">
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
