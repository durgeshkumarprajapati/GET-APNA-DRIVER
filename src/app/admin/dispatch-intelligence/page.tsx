'use client';

import { useEffect, useState } from 'react';

interface DispatchIntelligenceSummary {
  activeSearchesCount: number;
  searchesNearingDeadline: number;
  noDriverCancellations24h: number;
  availableDriversCount: number;
  searchDeadlineSeconds: number;
}

interface ActiveSearchDetail {
  bookingId: string;
  pickupAddress: string;
  startedAt: string;
  deadlineAt: string;
  remainingSeconds: number;
  attemptsCount: number;
}

export default function AdminDispatchIntelligencePage() {
  const [summary, setSummary] = useState<DispatchIntelligenceSummary | null>(null);
  const [activeSearches, setActiveSearches] = useState<ActiveSearchDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const res = await fetch('/api/admin/dispatch-intelligence');
        if (!res.ok) {
          throw new Error('Failed to load dispatch intelligence metrics');
        }
        const data = await res.json();
        if (active) {
          setSummary(data.summary);
          setActiveSearches(data.activeSearches ?? []);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Error loading dispatch telemetry');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchData();
    const interval = setInterval(() => {
      void fetchData();
    }, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-primary uppercase">
            DISPATCH & PRESENCE INTELLIGENCE
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface font-['Space_Grotesk'] mt-1">
            Intelligent Dispatch & Search Deadlines
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Real-time driver presence, candidate ranking telemetry, 2-minute search deadlines, and
            auto-cancellations.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-surface-container-high text-xs font-mono">
          <span className="text-outline">Search Deadline:</span>
          <span className="text-primary font-bold">120s Server Authoritative</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error-container/50 border border-error/50 text-on-error-container text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-on-surface-variant text-sm font-mono animate-pulse">
          Loading dispatch intelligence metrics…
        </div>
      ) : (
        summary && (
          <div className="space-y-6">
            {/* METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                    Active Driver Searches
                  </span>
                  <span className="material-symbols-outlined text-primary">manage_search</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-primary font-['Space_Grotesk']">
                  {summary.activeSearchesCount}
                </div>
                <p className="text-[11px] text-outline font-mono">
                  Bookings currently searching for driver
                </p>
              </div>

              <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                    Nearing Deadline (&gt;90s)
                  </span>
                  <span className="material-symbols-outlined text-on-warning-container">timer</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-on-warning-container font-['Space_Grotesk']">
                  {summary.searchesNearingDeadline}
                </div>
                <p className="text-[11px] text-outline font-mono">
                  Searches approaching 2-minute cutoff
                </p>
              </div>

              <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                    No-Driver Cancellations (24h)
                  </span>
                  <span className="material-symbols-outlined text-on-error-container">
                    person_off
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-on-error-container font-['Space_Grotesk']">
                  {summary.noDriverCancellations24h}
                </div>
                <p className="text-[11px] text-outline font-mono">
                  Auto-cancelled after 2-minute deadline
                </p>
              </div>

              <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                    Available Driver Pool
                  </span>
                  <span className="material-symbols-outlined text-primary">how_to_reg</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-primary font-['Space_Grotesk']">
                  {summary.availableDriversCount}
                </div>
                <p className="text-[11px] text-outline font-mono">
                  Drivers active in Redis GEO index
                </p>
              </div>
            </div>

            {/* ACTIVE SEARCHES TABLE */}
            <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-on-surface font-['Space_Grotesk'] flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">radar</span>
                  <span>Live Active Searches</span>
                </h2>
                <span className="text-xs text-outline font-mono">Auto-refreshes every 5s</span>
              </div>

              {activeSearches.length === 0 ? (
                <div className="py-8 text-center text-outline text-xs font-mono">
                  No active driver searches at this moment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-on-surface-variant">
                    <thead className="bg-surface-container text-outline font-mono uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4 rounded-l-lg">Booking ID</th>
                        <th className="py-3 px-4">Pickup Address</th>
                        <th className="py-3 px-4">Offers Attempted</th>
                        <th className="py-3 px-4">Remaining Time</th>
                        <th className="py-3 px-4 rounded-r-lg">Deadline Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high">
                      {activeSearches.map((search) => (
                        <tr
                          key={search.bookingId}
                          className="hover:bg-surface-container-low transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-on-surface">
                            {search.bookingId.slice(0, 8)}…
                          </td>
                          <td className="py-3.5 px-4 max-w-[220px] truncate">
                            {search.pickupAddress}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-primary">
                            {search.attemptsCount} attempts
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-on-warning-container">
                            {search.remainingSeconds}s
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                search.remainingSeconds <= 30
                                  ? 'bg-error-container/80 text-on-error-container border border-error'
                                  : 'bg-warning-container/80 text-on-warning-container border border-warning'
                              }`}
                            >
                              {search.remainingSeconds <= 30 ? 'CRITICAL' : 'SEARCHING'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
