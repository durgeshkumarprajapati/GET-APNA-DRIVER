'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';

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
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#68dba9] uppercase">
              DISPATCH & PRESENCE INTELLIGENCE
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dfe2ee] font-['Space_Grotesk'] mt-1">
              Intelligent Dispatch & Search Deadlines
            </h1>
            <p className="text-xs sm:text-sm text-[#bccac0] mt-1">
              Real-time driver presence, candidate ranking telemetry, 2-minute search deadlines, and
              auto-cancellations.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141822] border border-[#262a33] text-xs font-mono">
            <span className="text-[#87948b]">Search Deadline:</span>
            <span className="text-[#68dba9] font-bold">120s Server Authoritative</span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-[#bccac0] text-sm font-mono animate-pulse">
            Loading dispatch intelligence metrics…
          </div>
        ) : (
          summary && (
            <div className="space-y-6">
              {/* METRIC CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#141822] border border-[#262a33] rounded-2xl p-5 shadow-xl space-y-2">
                  <div className="flex items-center justify-between text-[#bccac0]">
                    <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                      Active Driver Searches
                    </span>
                    <span className="material-symbols-outlined text-[#68dba9]">manage_search</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#68dba9] font-['Space_Grotesk']">
                    {summary.activeSearchesCount}
                  </div>
                  <p className="text-[11px] text-[#87948b] font-mono">
                    Bookings currently searching for driver
                  </p>
                </div>

                <div className="bg-[#141822] border border-[#262a33] rounded-2xl p-5 shadow-xl space-y-2">
                  <div className="flex items-center justify-between text-[#bccac0]">
                    <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                      Nearing Deadline (&gt;90s)
                    </span>
                    <span className="material-symbols-outlined text-amber-400">timer</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-['Space_Grotesk']">
                    {summary.searchesNearingDeadline}
                  </div>
                  <p className="text-[11px] text-[#87948b] font-mono">
                    Searches approaching 2-minute cutoff
                  </p>
                </div>

                <div className="bg-[#141822] border border-[#262a33] rounded-2xl p-5 shadow-xl space-y-2">
                  <div className="flex items-center justify-between text-[#bccac0]">
                    <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                      No-Driver Cancellations (24h)
                    </span>
                    <span className="material-symbols-outlined text-rose-400">person_off</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-['Space_Grotesk']">
                    {summary.noDriverCancellations24h}
                  </div>
                  <p className="text-[11px] text-[#87948b] font-mono">
                    Auto-cancelled after 2-minute deadline
                  </p>
                </div>

                <div className="bg-[#141822] border border-[#262a33] rounded-2xl p-5 shadow-xl space-y-2">
                  <div className="flex items-center justify-between text-[#bccac0]">
                    <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                      Available Driver Pool
                    </span>
                    <span className="material-symbols-outlined text-[#68dba9]">how_to_reg</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-['Space_Grotesk']">
                    {summary.availableDriversCount}
                  </div>
                  <p className="text-[11px] text-[#87948b] font-mono">
                    Drivers active in Redis GEO index
                  </p>
                </div>
              </div>

              {/* ACTIVE SEARCHES TABLE */}
              <div className="bg-[#141822] border border-[#262a33] rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#dfe2ee] font-['Space_Grotesk'] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#68dba9]">radar</span>
                    <span>Live Active Searches</span>
                  </h2>
                  <span className="text-xs text-[#87948b] font-mono">Auto-refreshes every 5s</span>
                </div>

                {activeSearches.length === 0 ? (
                  <div className="py-8 text-center text-[#87948b] text-xs font-mono">
                    No active driver searches at this moment.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#bccac0]">
                      <thead className="bg-[#1c2028] text-[#87948b] font-mono uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4 rounded-l-lg">Booking ID</th>
                          <th className="py-3 px-4">Pickup Address</th>
                          <th className="py-3 px-4">Offers Attempted</th>
                          <th className="py-3 px-4">Remaining Time</th>
                          <th className="py-3 px-4 rounded-r-lg">Deadline Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#262a33]">
                        {activeSearches.map((search) => (
                          <tr
                            key={search.bookingId}
                            className="hover:bg-[#181c24] transition-colors"
                          >
                            <td className="py-3.5 px-4 font-mono font-bold text-[#dfe2ee]">
                              {search.bookingId.slice(0, 8)}…
                            </td>
                            <td className="py-3.5 px-4 max-w-[220px] truncate">
                              {search.pickupAddress}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-semibold text-[#68dba9]">
                              {search.attemptsCount} attempts
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                              {search.remainingSeconds}s
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                  search.remainingSeconds <= 30
                                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                                    : 'bg-amber-950/80 text-amber-300 border border-amber-800'
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
    </AdminLayout>
  );
}
